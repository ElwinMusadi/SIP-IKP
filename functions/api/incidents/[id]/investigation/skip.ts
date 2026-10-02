import type { CloudflareEnv } from "../../../../../src/types/cloudflare-env"
import { type IncidentReportRow } from "../../../../_shared/incident-service"
import { canSkipToCompleted } from "../../../../_shared/rbac"
import type { RequestContextData } from "../../../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../../../_shared/response"

/**
 * POST /api/incidents/:id/investigation/skip
 *
 * Skips simple investigation entirely for BIRU/HIJAU incidents in UNDER_REVIEW,
 * completing them directly as COMPLETED_BY_UNIT.
 *
 * Atomicity strategy — single D1 batch:
 *   [0] Guarded UPDATE report: WHERE id=? AND row_version=? AND status='UNDER_REVIEW'
 *   [1] Conditional audit INSERT: INSERT … SELECT … WHERE EXISTS (
 *           SELECT 1 FROM incident_reports
 *           WHERE id=? AND status='COMPLETED_BY_UNIT' AND row_version=?
 *       )
 *       → emits REPORT_COMPLETED only when [0] actually transitioned the row.
 *         Stale requests produce changes=0 in [0] AND the EXISTS guard is false,
 *         so no audit row is ever written for a failed transition.
 *
 *   We do NOT use createAuditPreparedStatement (unconditional) here because an
 *   unconditional INSERT in a batch would write an audit row even when the UPDATE
 *   guard failed (both statements run regardless of each other's results in D1 batch).
 *   Instead we build the conditional INSERT manually.
 *
 * Contract:
 * - Requires If-Match (mandatory, 428 if absent, 400 if malformed).
 * - Body must contain { confirmed: true }.
 * - 412 on stale/wrong-status.
 * - No simple_investigations row created.
 * - Emits REPORT_COMPLETED only; no SIMPLE_INVESTIGATION_COMPLETED.
 * - RBAC: Kepala Ruangan IBS; incident must be UNDER_REVIEW with risk_grade BIRU or HIJAU.
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

  let body: Record<string, unknown> = {}
  try {
    const raw: unknown = await request.json()
    if (typeof raw === "object" && raw !== null) {
      body = raw as Record<string, unknown>
    }
  } catch {
    return problemResponse(
      {
        status: 400,
        code: "MALFORMED_REQUEST",
        title: "Permintaan Tidak Valid",
        detail: "Format JSON pada request body tidak valid.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  if (body.confirmed !== true) {
    return problemResponse(
      {
        status: 422,
        code: "CONFIRMATION_REQUIRED",
        title: "Konfirmasi Diperlukan",
        detail:
          "Field `confirmed` harus bernilai true untuk mengkonfirmasi penyelesaian langsung tanpa investigasi sederhana.",
        instance: url.pathname,
        errors: [
          {
            path: "confirmed",
            code: "REQUIRED_TRUE",
            message: "Konfirmasi wajib: set confirmed = true.",
          },
        ],
      },
      requestId,
    )
  }

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
  if (!canSkipToCompleted(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail:
          "Hanya Kepala Ruangan IBS yang dapat melewati investigasi sederhana pada insiden BIRU/HIJAU berstatus UNDER_REVIEW.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const nowIso = new Date().toISOString()
  const nextVersion = report.row_version + 1
  const auditId = crypto.randomUUID()

  // [0] Guarded UPDATE: transitions report only when version and status match.
  const guardedUpdateStmt = env.DB.prepare(
    `UPDATE incident_reports SET
      status = 'COMPLETED_BY_UNIT',
      completed_at = ?,
      row_version = ?,
      updated_at = ?
    WHERE id = ? AND row_version = ? AND status = 'UNDER_REVIEW'`,
  ).bind(nowIso, nextVersion, nowIso, incidentId, expectedVersion)

  // [1] Conditional audit INSERT: only writes when [0] actually completed the transition.
  //     The EXISTS sub-select guards on the post-transition state (status + nextVersion),
  //     so a stale [0] (changes=0) means the row is still UNDER_REVIEW/old-version → no audit.
  const conditionalAuditStmt = env.DB.prepare(
    `INSERT INTO audit_records (id, incident_id, event_type, actor_user_id, actor_name, actor_role, occurred_at_utc, notes, request_id)
     SELECT ?, ?, 'REPORT_COMPLETED', ?, ?, ?, ?, ?, ?
     WHERE EXISTS (
       SELECT 1 FROM incident_reports
       WHERE id = ? AND status = 'COMPLETED_BY_UNIT' AND row_version = ?
     )`,
  ).bind(
    auditId,
    incidentId,
    user.id,
    user.fullName,
    user.role,
    nowIso,
    "Laporan insiden BIRU/HIJAU diselesaikan langsung di tingkat unit tanpa investigasi sederhana (COMPLETED_BY_UNIT)",
    requestId,
    incidentId,
    nextVersion,
  )

  const batchResults = await env.DB.batch([guardedUpdateStmt, conditionalAuditStmt])
  const updateResult = batchResults[0]

  // Stale or wrong-status: UPDATE guard produced no changes.
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
