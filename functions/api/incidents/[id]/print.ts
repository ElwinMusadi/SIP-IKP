import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import { queryIncidentAuditRecords } from "../../../_shared/audit"
import type { IncidentReportRow } from "../../../_shared/incident-service"
import { canReadReport, sanitizeReportForUser } from "../../../_shared/rbac"
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
  if (!canReadReport(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail: "Anda tidak memiliki wewenang untuk mencetak laporan insiden ini.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const [investigation, snapshot, rawAuditRecords] = await Promise.all([
    env.DB.prepare("SELECT * FROM simple_investigations WHERE incident_id = ? LIMIT 1;")
      .bind(incidentId)
      .first(),
    env.DB.prepare("SELECT * FROM incident_submission_snapshots WHERE incident_id = ? LIMIT 1;")
      .bind(incidentId)
      .first(),
    queryIncidentAuditRecords(env.DB, incidentId),
  ])

  // Enforce privacy: Administrator has clinical narrative & patient PII stripped
  const sanitizedReport = sanitizeReportForUser(user, report as unknown as Record<string, unknown>)

  // Audit list contains event metadata only; old/new diffs omitted
  const auditList = rawAuditRecords.map((r) => ({
    id: r.id,
    eventType: r.event_type,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    occurredAt: r.occurred_at_utc,
    notes: r.notes,
    requestId: r.request_id,
  }))

  return jsonResponse(
    {
      report: sanitizedReport,
      investigation: investigation ?? null,
      submissionSnapshot: snapshot ?? null,
      auditRecords: auditList,
      printedAt: new Date().toISOString(),
    },
    requestId,
  )
}
