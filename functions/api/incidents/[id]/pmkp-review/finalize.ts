import type { CloudflareEnv } from "../../../../../src/types/cloudflare-env"
import { createAuditPreparedStatement } from "../../../../_shared/audit"
import type { IncidentReportRow } from "../../../../_shared/incident-service"
import { canFinalizeRcaHandoff } from "../../../../_shared/rbac"
import type { RequestContextData } from "../../../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../../../_shared/response"

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
  if (!canFinalizeRcaHandoff(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail:
          "Hanya Komite PMKP atau Kepala Ruangan IBS yang dapat menyelesaikan serah terima RCA pada status PMKP_REVIEW.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const nowIso = new Date().toISOString()
  const nextVersion = report.row_version + 1

  // Atomic D1 batch:
  // 1. Update incident_reports: status = 'COMPLETED', pmkp_reviewed = 1, completed_at = now
  const updateReportStmt = env.DB.prepare(
    `UPDATE incident_reports SET
      status = 'COMPLETED',
      pmkp_reviewed = 1,
      completed_at = ?,
      row_version = ?,
      updated_at = ?
    WHERE id = ?`,
  ).bind(nowIso, nextVersion, nowIso, incidentId)

  // 2. Insert REPORT_COMPLETED audit event
  const auditReportStmt = createAuditPreparedStatement(env.DB, {
    incidentId,
    eventType: "REPORT_COMPLETED",
    actor: user,
    requestId,
    notes:
      "Laporan insiden diselesaikan setelah serah terima investigasi komprehensif / RCA eksternal",
    occurredAt: nowIso,
  })

  await env.DB.batch([updateReportStmt, auditReportStmt])

  const updatedReport = await env.DB.prepare("SELECT * FROM incident_reports WHERE id = ? LIMIT 1;")
    .bind(incidentId)
    .first<IncidentReportRow>()

  return jsonResponse(updatedReport, requestId, 200, {
    ETag: `"W/${String(nextVersion)}"`,
  })
}
