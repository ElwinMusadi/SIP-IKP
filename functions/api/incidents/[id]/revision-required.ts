import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import { createAuditPreparedStatement } from "../../../_shared/audit"
import type { IncidentReportRow } from "../../../_shared/incident-service"
import { canRequestRevision } from "../../../_shared/rbac"
import type { RequestContextData } from "../../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../../_shared/response"

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
        detail: "Laporan insiden dengan ID yang ditentukan tidak ditemukan.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const user = auth.user
  if (!canRequestRevision(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail:
          "Hanya Kepala Ruangan IBS yang dapat meminta revisi laporan saat status SUBMITTED atau UNDER_REVIEW.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  let body: Record<string, unknown> = {}
  try {
    const raw: unknown = await request.json()
    if (typeof raw === "object" && raw !== null) {
      body = raw as Record<string, unknown>
    }
  } catch {
    // optional body
  }

  // Revision reason is optional per workshop decision
  const revisionReason =
    typeof body.revision_reason === "string" ? body.revision_reason.trim() : null

  const nowIso = new Date().toISOString()
  const nextVersion = report.row_version + 1

  const updateStmt = env.DB.prepare(
    `UPDATE incident_reports SET
      status = 'REVISION_REQUIRED',
      revision_reason = ?,
      row_version = ?,
      updated_at = ?
    WHERE id = ?`,
  ).bind(revisionReason, nextVersion, nowIso, incidentId)

  const auditStmt = createAuditPreparedStatement(env.DB, {
    incidentId,
    eventType: "REVISION_REQUIRED",
    actor: user,
    requestId,
    notes: revisionReason ?? "Kepala Ruangan meminta perbaikan/revisi laporan",
    occurredAt: nowIso,
  })

  await env.DB.batch([updateStmt, auditStmt])

  const updatedReport = await env.DB.prepare("SELECT * FROM incident_reports WHERE id = ? LIMIT 1;")
    .bind(incidentId)
    .first<IncidentReportRow>()

  return jsonResponse(updatedReport, requestId, 200, {
    ETag: `"W/${String(nextVersion)}"`,
  })
}
