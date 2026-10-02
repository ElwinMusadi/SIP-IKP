import type { CloudflareEnv } from "../../../../../src/types/cloudflare-env"
import { type IncidentReportRow } from "../../../../_shared/incident-service"
import { canStartSimpleInvestigation } from "../../../../_shared/rbac"
import type { RequestContextData } from "../../../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../../../_shared/response"

/**
 * POST /api/incidents/:id/investigation/start
 *
 * Transitions a BIRU/HIJAU incident from UNDER_REVIEW → SIMPLE_INVESTIGATION and
 * creates the simple_investigations row in a single atomic D1 batch.
 *
 * Atomicity strategy:
 *   D1 batch executes statements in order within an implicit transaction and rolls back
 *   all statements if any statement throws. We use:
 *
 *   [0] Guarded UPDATE: WHERE id=? AND row_version=? AND status='UNDER_REVIEW'
 *       → changes=1 on success, changes=0 on stale/wrong-status
 *   [1] Conditional INSERT OR IGNORE … SELECT … WHERE EXISTS (
 *           SELECT 1 FROM incident_reports
 *           WHERE id=? AND status='SIMPLE_INVESTIGATION' AND row_version=?
 *       )
 *       → inserts investigation row only when the report is now SIMPLE_INVESTIGATION
 *         at nextVersion; is a no-op (not an error) if a row already exists (UNIQUE constraint)
 *
 *   After batch we check [0].meta.changes. If 0 the UPDATE guard failed → 412.
 *   The conditional INSERT cannot succeed unless [0] succeeded, so there is no orphan.
 *   If the batch itself throws (e.g. D1 error), the whole transaction is rolled back.
 *
 * No audit event is emitted — SIMPLE_INVESTIGATION_STARTED is not in the allowlist.
 */
export const onRequestPost: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
  env,
  data,
  params,
  request,
}) => {
  const requestId = data.requestId
  const url = new URL(request.url)
  const auth = data.auth

  if (!auth) {
    return problemResponse(
      {
        status: 401,
        code: "AUTHENTICATION_REQUIRED",
        title: "Otentikasi Diperlukan",
        detail: "Sesi otentikasi tidak ditemukan atau telah berakhir.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  // If-Match is mandatory
  const ifMatchHeader = request.headers.get("If-Match")
  if (!ifMatchHeader) {
    return problemResponse(
      {
        status: 428,
        code: "PRECONDITION_REQUIRED",
        title: "Header If-Match Wajib",
        detail:
          "Header If-Match wajib disertakan untuk mencegah pembaruan bersamaan yang tidak terdeteksi.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const versionMatch = /^"W\/(\d+)"$/.exec(ifMatchHeader)
  if (!versionMatch?.[1]) {
    return problemResponse(
      {
        status: 400,
        code: "INVALID_IF_MATCH",
        title: "Format If-Match Tidak Valid",
        detail: 'Header If-Match harus dalam format "W/<version>", misalnya "W/3".',
        instance: url.pathname,
      },
      requestId,
    )
  }
  const expectedVersion = Number.parseInt(versionMatch[1], 10)

  const incidentId = typeof params.id === "string" ? params.id : (params.id[0] ?? "")
  const report = await env.DB.prepare("SELECT * FROM incident_reports WHERE id = ? LIMIT 1;")
    .bind(incidentId)
    .first<IncidentReportRow>()

  if (!report) {
    return problemResponse(
      {
        status: 404,
        code: "INCIDENT_NOT_FOUND",
        title: "Laporan Tidak Ditemukan",
        detail: "Laporan insiden dengan ID yang ditentukan tidak ditemukan.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const user = auth.user
  if (!canStartSimpleInvestigation(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail:
          "Hanya Kepala Ruangan IBS yang dapat memulai investigasi sederhana pada insiden BIRU/HIJAU berstatus UNDER_REVIEW.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const nowIso = new Date().toISOString()
  const nextVersion = report.row_version + 1
  const invId = crypto.randomUUID()

  // [0] Guarded UPDATE: transitions report only when version and status match.
  const guardedUpdateStmt = env.DB.prepare(
    `UPDATE incident_reports SET
      status = 'SIMPLE_INVESTIGATION',
      row_version = ?,
      updated_at = ?
    WHERE id = ? AND row_version = ? AND status = 'UNDER_REVIEW'`,
  ).bind(nextVersion, nowIso, incidentId, expectedVersion)

  // [1] Conditional INSERT: creates investigation row only if the report is now at
  //     SIMPLE_INVESTIGATION/nextVersion (i.e. [0] succeeded).
  //     INSERT OR IGNORE handles the edge case where a row already exists (UNIQUE on incident_id).
  const conditionalInsertStmt = env.DB.prepare(
    `INSERT OR IGNORE INTO simple_investigations (id, incident_id, recommendations, actions, created_at, updated_at)
     SELECT ?, ?, '[]', '[]', ?, ?
     WHERE EXISTS (
       SELECT 1 FROM incident_reports
       WHERE id = ? AND status = 'SIMPLE_INVESTIGATION' AND row_version = ?
     )`,
  ).bind(invId, incidentId, nowIso, nowIso, incidentId, nextVersion)

  const batchResults = await env.DB.batch([guardedUpdateStmt, conditionalInsertStmt])
  const updateResult = batchResults[0]

  // Stale or wrong-status: the UPDATE guard produced no changes.
  if (!updateResult?.meta.changes || updateResult.meta.changes === 0) {
    return problemResponse(
      {
        status: 412,
        code: "PRECONDITION_FAILED",
        title: "Konflik Versi Data (Concurrency Error)",
        detail:
          "Data telah diubah oleh sesi lain atau status tidak lagi UNDER_REVIEW. Muat ulang halaman untuk mendapatkan versi terbaru.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const updatedReport = await env.DB.prepare("SELECT * FROM incident_reports WHERE id = ? LIMIT 1;")
    .bind(incidentId)
    .first<IncidentReportRow>()

  return jsonResponse(updatedReport, requestId, 200, {
    ETag: `"W/${String(nextVersion)}"`,
  })
}
