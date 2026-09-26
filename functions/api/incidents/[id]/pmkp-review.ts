import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import type { IncidentReportRow } from "../../../_shared/incident-service"
import { canReadReport, canUpdatePmkpReview } from "../../../_shared/rbac"
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
    "SELECT id, status, created_by_user_id, owning_unit_id, pmkp_reviewed, pmkp_review_notes FROM incident_reports WHERE id = ? LIMIT 1;",
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
        detail: "Anda tidak memiliki wewenang untuk membaca review PMKP laporan ini.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  return jsonResponse(
    {
      pmkp_reviewed: Boolean(report.pmkp_reviewed),
      pmkp_review_notes: report.pmkp_review_notes,
    },
    requestId,
  )
}

export const onRequestPut: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
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
    "SELECT id, status, created_by_user_id, owning_unit_id, pmkp_reviewed, row_version FROM incident_reports WHERE id = ? LIMIT 1;",
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

  const user = auth.user
  if (!canUpdatePmkpReview(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail:
          "Hanya Komite PMKP yang dapat memperbarui catatan review pada status PMKP_REVIEW sebelum finalisasi.",
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

  const reviewNotes =
    typeof body.pmkp_review_notes === "string" ? body.pmkp_review_notes.trim() : null
  const nowIso = new Date().toISOString()
  const nextVersion = report.row_version + 1

  await env.DB.prepare(
    `UPDATE incident_reports SET
      pmkp_review_notes = ?,
      row_version = ?,
      updated_at = ?
    WHERE id = ?`,
  )
    .bind(reviewNotes, nextVersion, nowIso, incidentId)
    .run()

  return jsonResponse(
    {
      pmkp_reviewed: Boolean(report.pmkp_reviewed),
      pmkp_review_notes: reviewNotes,
    },
    requestId,
  )
}
