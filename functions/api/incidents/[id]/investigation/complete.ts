import type { CloudflareEnv } from "../../../../../src/types/cloudflare-env"
import {
  validateInvestigationCompletion,
  type IncidentReportRow,
} from "../../../../_shared/incident-service"
import { canCompleteSimpleInvestigation } from "../../../../_shared/rbac"
import type { RequestContextData } from "../../../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../../../_shared/response"

interface SimpleInvestigationRow {
  id: string
  incident_id: string
  direct_cause: string | null
  underlying_root_cause: string | null
  investigation_start_date: string | null
  investigation_end_date: string | null
  recommendations: string
  actions: string
  completed_by_user_id: string | null
  completed_at: string | null
}

/**
 * POST /api/incidents/:id/investigation/complete
 *
 * Completes a simple investigation and transitions the incident to COMPLETED_BY_UNIT.
 *
 * Atomicity strategy — single D1 batch of 4 statements:
 *   [0] Guarded UPDATE report: WHERE id=? AND row_version=? AND status='SIMPLE_INVESTIGATION'
 *   [1] Conditional UPDATE simple_investigations: WHERE incident_id=?
 *         guarded by EXISTS (report at nextVersion/COMPLETED_BY_UNIT)
 *   [2] Conditional INSERT SIMPLE_INVESTIGATION_COMPLETED audit: same EXISTS guard
 *   [3] Conditional INSERT REPORT_COMPLETED audit: same EXISTS guard
 *
 *   After batch: check [0].meta.changes. If 0 → stale/wrong-status → 412.
 *   All conditional statements produce no rows when [0] fails, preventing phantom audits.
 *   D1 batch rolls back all statements on any error.
 *
 * If-Match header is mandatory (428 absent, 400 malformed).
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
          "Header If-Match wajib disertakan untuk mencegah penyelesaian ganda yang tidak terdeteksi.",
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
        detail: "Laporan insiden tidak ditemukan.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const user = auth.user
  if (!canCompleteSimpleInvestigation(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail:
          "Hanya Kepala Ruangan IBS yang dapat menyelesaikan investigasi sederhana saat status SIMPLE_INVESTIGATION.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  // Fetch current investigation row (pre-batch read for validation only)
  const investigation = await env.DB.prepare(
    "SELECT * FROM simple_investigations WHERE incident_id = ? LIMIT 1;",
  )
    .bind(incidentId)
    .first<SimpleInvestigationRow>()

  if (!investigation) {
    return problemResponse(
      {
        status: 422,
        code: "INVESTIGATION_INCOMPLETE",
        title: "Investigasi Belum Lengkap",
        detail: "Data investigasi sederhana belum diisi.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  // Validate all Form page 3 fields are complete before touching the DB
  const validation = validateInvestigationCompletion({
    direct_cause: investigation.direct_cause,
    underlying_root_cause: investigation.underlying_root_cause,
    investigation_start_date: investigation.investigation_start_date,
    investigation_end_date: investigation.investigation_end_date,
    recommendations: investigation.recommendations,
    actions: investigation.actions,
  })

  if (!validation.isValid) {
    return problemResponse(
      {
        status: 422,
        code: "INVESTIGATION_INCOMPLETE",
        title: "Kelengkapan Lembar Investigasi Belum Memenuhi Syarat",
        detail:
          "Seluruh field pada lembar investigasi sederhana (penyebab langsung, akar masalah, rentang tanggal yang valid, minimal 1 rekomendasi lengkap, dan minimal 1 tindakan perbaikan lengkap) wajib diisi sebelum investigasi dapat diselesaikan.",
        instance: url.pathname,
        errors: validation.errors,
      },
      requestId,
    )
  }

  const nowIso = new Date().toISOString()
  const nextVersion = report.row_version + 1
  const auditInvId = crypto.randomUUID()
  const auditReportId = crypto.randomUUID()

  // Shared EXISTS guard: the report is at nextVersion/COMPLETED_BY_UNIT after [0] succeeds.
  // All conditional statements [1..3] use this same predicate so no rows are written
  // if [0] was a no-op (stale or wrong status).
  const existsGuard = `EXISTS (
    SELECT 1 FROM incident_reports
    WHERE id = ? AND status = 'COMPLETED_BY_UNIT' AND row_version = ?
  )`

  // [0] Guarded report UPDATE: transitions to COMPLETED_BY_UNIT only when version+status match.
  const updateReportStmt = env.DB.prepare(
    `UPDATE incident_reports SET
      status = 'COMPLETED_BY_UNIT',
      completed_at = ?,
      row_version = ?,
      updated_at = ?
    WHERE id = ? AND row_version = ? AND status = 'SIMPLE_INVESTIGATION'`,
  ).bind(nowIso, nextVersion, nowIso, incidentId, expectedVersion)

  // [1] Conditional investigation stamp: mark completed_by/completed_at only when [0] succeeded.
  const updateInvStmt = env.DB.prepare(
    `UPDATE simple_investigations SET
      completed_by_user_id = ?,
      completed_at = ?,
      updated_at = ?
    WHERE incident_id = ? AND ${existsGuard}`,
  ).bind(user.id, nowIso, nowIso, incidentId, incidentId, nextVersion)

  // [2] Conditional SIMPLE_INVESTIGATION_COMPLETED audit INSERT.
  const auditInvStmt = env.DB.prepare(
    `INSERT INTO audit_records (id, incident_id, event_type, actor_user_id, actor_name, actor_role, occurred_at_utc, notes, request_id)
     SELECT ?, ?, 'SIMPLE_INVESTIGATION_COMPLETED', ?, ?, ?, ?, ?, ?
     WHERE ${existsGuard}`,
  ).bind(
    auditInvId,
    incidentId,
    user.id,
    user.fullName,
    user.role,
    nowIso,
    "Investigasi sederhana diselesaikan oleh Kepala Ruangan IBS",
    requestId,
    incidentId,
    nextVersion,
  )

  // [3] Conditional REPORT_COMPLETED audit INSERT.
  const auditReportStmt = env.DB.prepare(
    `INSERT INTO audit_records (id, incident_id, event_type, actor_user_id, actor_name, actor_role, occurred_at_utc, notes, request_id)
     SELECT ?, ?, 'REPORT_COMPLETED', ?, ?, ?, ?, ?, ?
     WHERE ${existsGuard}`,
  ).bind(
    auditReportId,
    incidentId,
    user.id,
    user.fullName,
    user.role,
    nowIso,
    "Laporan insiden diselesaikan di tingkat unit (COMPLETED_BY_UNIT)",
    requestId,
    incidentId,
    nextVersion,
  )

  const batchResults = await env.DB.batch([
    updateReportStmt,
    updateInvStmt,
    auditInvStmt,
    auditReportStmt,
  ])
  const updateReportResult = batchResults[0]

  // Stale or wrong status: guarded UPDATE produced no changes.
  if (!updateReportResult?.meta.changes || updateReportResult.meta.changes === 0) {
    return problemResponse(
      {
        status: 412,
        code: "PRECONDITION_FAILED",
        title: "Konflik Versi Data (Concurrency Error)",
        detail:
          "Data telah diubah oleh sesi lain atau status tidak lagi SIMPLE_INVESTIGATION. Muat ulang halaman untuk mendapatkan versi terbaru.",
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
