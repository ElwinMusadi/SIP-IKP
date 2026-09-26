import type { CloudflareEnv } from "../../../../../src/types/cloudflare-env"
import { createAuditPreparedStatement } from "../../../../_shared/audit"
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

  // Fetch current investigation row
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

  // Validate all Form page 3 fields are complete
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

  // Atomic D1 batch:
  // 1. Update simple_investigations: completed_by_user_id = user.id, completed_at = now
  const updateInvStmt = env.DB.prepare(
    `UPDATE simple_investigations SET
      completed_by_user_id = ?,
      completed_at = ?,
      updated_at = ?
    WHERE incident_id = ?`,
  ).bind(user.id, nowIso, nowIso, incidentId)

  // 2. Update incident_reports: status = 'COMPLETED_BY_UNIT', completed_at = now
  const updateReportStmt = env.DB.prepare(
    `UPDATE incident_reports SET
      status = 'COMPLETED_BY_UNIT',
      completed_at = ?,
      row_version = ?,
      updated_at = ?
    WHERE id = ?`,
  ).bind(nowIso, nextVersion, nowIso, incidentId)

  // 3. Insert SIMPLE_INVESTIGATION_COMPLETED audit event
  const auditInvStmt = createAuditPreparedStatement(env.DB, {
    incidentId,
    eventType: "SIMPLE_INVESTIGATION_COMPLETED",
    actor: user,
    requestId,
    notes: "Investigasi sederhana diselesaikan oleh Kepala Ruangan IBS",
    occurredAt: nowIso,
  })

  // 4. Insert REPORT_COMPLETED audit event
  const auditReportStmt = createAuditPreparedStatement(env.DB, {
    incidentId,
    eventType: "REPORT_COMPLETED",
    actor: user,
    requestId,
    notes: "Laporan insiden diselesaikan di tingkat unit (COMPLETED_BY_UNIT)",
    occurredAt: nowIso,
  })

  await env.DB.batch([updateInvStmt, updateReportStmt, auditInvStmt, auditReportStmt])

  const updatedReport = await env.DB.prepare("SELECT * FROM incident_reports WHERE id = ? LIMIT 1;")
    .bind(incidentId)
    .first<IncidentReportRow>()

  return jsonResponse(updatedReport, requestId, 200, {
    ETag: `"W/${String(nextVersion)}"`,
  })
}
