import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import { queryIncidentAuditRecords } from "../../../_shared/audit"
import type { IncidentReportRow } from "../../../_shared/incident-service"
import { canReadReport } from "../../../_shared/rbac"
import type { RequestContextData } from "../../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../../_shared/response"

export const onRequestGet: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
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
  const report = await env.DB.prepare(
    "SELECT id, status, created_by_user_id, owning_unit_id FROM incident_reports WHERE id = ? LIMIT 1;",
  )
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

  if (!canReadReport(auth.user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail: "Anda tidak memiliki wewenang untuk membaca jejak audit laporan ini.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const records = await queryIncidentAuditRecords(env.DB, incidentId)

  // Format: event and action only. Zero old/new values, zero changed field lists per workshop decision.
  const auditList = records.map((r) => ({
    id: r.id,
    eventType: r.event_type,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    occurredAt: r.occurred_at_utc,
    notes: r.notes,
    requestId: r.request_id,
  }))

  return jsonResponse(auditList, requestId)
}
