import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import {
  type IncidentReportRow,
  type InvestigationDataInput,
} from "../../../_shared/incident-service"
import { canFillSimpleInvestigation, canReadReport } from "../../../_shared/rbac"
import type { RequestContextData } from "../../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../../_shared/response"

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
  created_at: string
  updated_at: string
}

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
        detail: "Anda tidak memiliki wewenang untuk membaca investigasi laporan ini.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const investigation = await env.DB.prepare(
    "SELECT * FROM simple_investigations WHERE incident_id = ? LIMIT 1;",
  )
    .bind(incidentId)
    .first<SimpleInvestigationRow>()

  return jsonResponse(investigation ?? null, requestId)
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

  const user = auth.user
  if (!canFillSimpleInvestigation(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail:
          "Hanya Kepala Ruangan IBS yang dapat mengisi lembar investigasi sederhana saat status SIMPLE_INVESTIGATION.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  let body: InvestigationDataInput = {}
  try {
    const raw: unknown = await request.json()
    if (typeof raw === "object" && raw !== null) {
      body = raw
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

  const nowIso = new Date().toISOString()
  const directCause = typeof body.direct_cause === "string" ? body.direct_cause : null
  const rootCause =
    typeof body.underlying_root_cause === "string" ? body.underlying_root_cause : null
  const startDate =
    typeof body.investigation_start_date === "string" ? body.investigation_start_date : null
  const endDate =
    typeof body.investigation_end_date === "string" ? body.investigation_end_date : null

  // Date range check: end >= start
  if (startDate && endDate && endDate < startDate) {
    return problemResponse(
      {
        status: 422,
        code: "DATE_ORDER_INVALID",
        title: "Urutan Tanggal Tidak Valid",
        detail: "Tanggal selesai investigasi tidak boleh mendahului tanggal mulai.",
        instance: url.pathname,
        errors: [
          {
            path: "investigation_end_date",
            code: "DATE_ORDER",
            message: "Tanggal selesai harus >= tanggal mulai.",
          },
        ],
      },
      requestId,
    )
  }

  const recsJson = Array.isArray(body.recommendations)
    ? JSON.stringify(body.recommendations)
    : typeof body.recommendations === "string"
      ? body.recommendations
      : "[]"

  const actionsJson = Array.isArray(body.actions)
    ? JSON.stringify(body.actions)
    : typeof body.actions === "string"
      ? body.actions
      : "[]"

  // Upsert single simple investigation record (revisions overwrite same record per workshop decision)
  const id = crypto.randomUUID()
  await env.DB.prepare(
    `INSERT INTO simple_investigations (
      id, incident_id, direct_cause, underlying_root_cause,
      investigation_start_date, investigation_end_date,
      recommendations, actions, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?
    )
    ON CONFLICT (incident_id) DO UPDATE SET
      direct_cause = excluded.direct_cause,
      underlying_root_cause = excluded.underlying_root_cause,
      investigation_start_date = excluded.investigation_start_date,
      investigation_end_date = excluded.investigation_end_date,
      recommendations = excluded.recommendations,
      actions = excluded.actions,
      updated_at = excluded.updated_at`,
  )
    .bind(
      id,
      incidentId,
      directCause,
      rootCause,
      startDate,
      endDate,
      recsJson,
      actionsJson,
      nowIso,
      nowIso,
    )
    .run()

  const updatedInvestigation = await env.DB.prepare(
    "SELECT * FROM simple_investigations WHERE incident_id = ? LIMIT 1;",
  )
    .bind(incidentId)
    .first<SimpleInvestigationRow>()

  return jsonResponse(updatedInvestigation, requestId)
}
