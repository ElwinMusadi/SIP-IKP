import type { CloudflareEnv } from "../../../src/types/cloudflare-env"
import type { IncidentReportRow } from "../../_shared/incident-service"
import {
  canDeleteDraft,
  canEditDraft,
  canReadReport,
  sanitizeReportForUser,
} from "../../_shared/rbac"
import type { RequestContextData } from "../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../_shared/response"

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
        detail: "Anda tidak memiliki wewenang untuk membaca laporan ini.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const [investigation, snapshot] = await Promise.all([
    env.DB.prepare("SELECT * FROM simple_investigations WHERE incident_id = ? LIMIT 1;")
      .bind(incidentId)
      .first(),
    env.DB.prepare("SELECT * FROM incident_submission_snapshots WHERE incident_id = ? LIMIT 1;")
      .bind(incidentId)
      .first(),
  ])

  const sanitizedReport = sanitizeReportForUser(user, report as unknown as Record<string, unknown>)

  return jsonResponse(
    {
      ...sanitizedReport,
      investigation: investigation ?? null,
      submissionSnapshot: snapshot ?? null,
    },
    requestId,
    200,
    {
      ETag: `"W/${String(report.row_version)}"`,
    },
  )
}

export const onRequestPatch: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
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
  if (!canEditDraft(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail: "Hanya pembuat draf yang dapat memperbarui atau menyimpan draf laporan.",
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

  // Concurrency check via If-Match header or body.row_version
  const ifMatchHeader = request.headers.get("If-Match")
  let expectedVersion: number | null = null
  if (ifMatchHeader) {
    const match = /"W\/(\d+)"/.exec(ifMatchHeader)
    if (match?.[1]) {
      expectedVersion = Number.parseInt(match[1], 10)
    }
  } else if (typeof body.row_version === "number") {
    expectedVersion = body.row_version
  }

  if (expectedVersion !== null && report.row_version !== expectedVersion) {
    return problemResponse(
      {
        status: 412,
        code: "PRECONDITION_FAILED",
        title: "Konflik Versi Data (Concurrency Error)",
        detail:
          "Data telah diubah oleh sesi lain. Muat ulang halaman untuk mendapatkan versi terbaru.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const now = new Date().toISOString()
  const nextVersion = report.row_version + 1

  // Extract updatable draft fields
  const updatedReporterName =
    typeof body.reporter_name === "string" ? body.reporter_name : report.reporter_name
  const updatedReporterRole =
    typeof body.reporter_role === "string" ? body.reporter_role : report.reporter_role
  const updatedPatientName =
    body.patient_name !== undefined ? (body.patient_name as string) : report.patient_name
  const updatedMr =
    body.medical_record_number !== undefined
      ? (body.medical_record_number as string)
      : report.medical_record_number
  const updatedRoom =
    body.patient_room !== undefined ? (body.patient_room as string) : report.patient_room
  const updatedAgeCat =
    body.patient_age_category !== undefined
      ? (body.patient_age_category as string)
      : report.patient_age_category
  const updatedGender =
    body.patient_gender !== undefined ? (body.patient_gender as string) : report.patient_gender
  const updatedPayer =
    body.patient_payer_type !== undefined
      ? (body.patient_payer_type as string)
      : report.patient_payer_type
  const updatedAdmission =
    body.admission_datetime !== undefined
      ? (body.admission_datetime as string)
      : report.admission_datetime
  const updatedIncidentDatetime =
    typeof body.incident_datetime === "string" ? body.incident_datetime : report.incident_datetime
  const updatedIncidentTitle =
    body.incident_title !== undefined ? (body.incident_title as string) : report.incident_title
  const updatedChronology =
    body.chronology !== undefined ? (body.chronology as string) : report.chronology
  const updatedIncidentType =
    typeof body.incident_type === "string" ? body.incident_type : report.incident_type
  const updatedReporterCat =
    body.initial_reporter_category !== undefined
      ? (body.initial_reporter_category as string)
      : report.initial_reporter_category
  const updatedReporterDetail =
    body.initial_reporter_detail !== undefined
      ? (body.initial_reporter_detail as string)
      : report.initial_reporter_detail
  const updatedIncidentTarget =
    typeof body.incident_target === "string" ? body.incident_target : report.incident_target
  const updatedTargetOther =
    body.incident_target_other !== undefined
      ? (body.incident_target_other as string)
      : report.incident_target_other
  const updatedCareType =
    body.patient_care_type !== undefined
      ? (body.patient_care_type as string)
      : report.patient_care_type
  const updatedLocation =
    body.incident_location !== undefined
      ? (body.incident_location as string)
      : report.incident_location
  const updatedSpecialization =
    body.clinical_specialization !== undefined
      ? (body.clinical_specialization as string)
      : report.clinical_specialization
  const updatedCausingUnit =
    body.causing_unit !== undefined ? (body.causing_unit as string) : report.causing_unit
  const updatedImpact =
    body.patient_impact !== undefined ? (body.patient_impact as string) : report.patient_impact
  const updatedImmediateAction =
    body.immediate_action_and_result !== undefined
      ? (body.immediate_action_and_result as string)
      : report.immediate_action_and_result
  const updatedActionBy =
    body.action_taken_by !== undefined ? (body.action_taken_by as string) : report.action_taken_by
  const updatedSimilar =
    body.similar_incident_occurred !== undefined
      ? (body.similar_incident_occurred as string)
      : report.similar_incident_occurred
  const updatedSimilarDetails =
    body.similar_incident_details !== undefined
      ? (body.similar_incident_details as string)
      : report.similar_incident_details
  const updatedOverdueReason =
    body.overdue_reason !== undefined ? (body.overdue_reason as string) : report.overdue_reason

  await env.DB.prepare(
    `UPDATE incident_reports SET
      reporter_name = ?, reporter_role = ?,
      patient_name = ?, medical_record_number = ?, patient_room = ?,
      patient_age_category = ?, patient_gender = ?, patient_payer_type = ?,
      admission_datetime = ?, incident_datetime = ?, incident_title = ?,
      chronology = ?, incident_type = ?, initial_reporter_category = ?,
      initial_reporter_detail = ?, incident_target = ?, incident_target_other = ?,
      patient_care_type = ?, incident_location = ?, clinical_specialization = ?,
      causing_unit = ?, patient_impact = ?, immediate_action_and_result = ?,
      action_taken_by = ?, similar_incident_occurred = ?, similar_incident_details = ?,
      overdue_reason = ?, row_version = ?, updated_at = ?
    WHERE id = ?`,
  )
    .bind(
      updatedReporterName,
      updatedReporterRole,
      updatedPatientName,
      updatedMr,
      updatedRoom,
      updatedAgeCat,
      updatedGender,
      updatedPayer,
      updatedAdmission,
      updatedIncidentDatetime,
      updatedIncidentTitle,
      updatedChronology,
      updatedIncidentType,
      updatedReporterCat,
      updatedReporterDetail,
      updatedIncidentTarget,
      updatedTargetOther,
      updatedCareType,
      updatedLocation,
      updatedSpecialization,
      updatedCausingUnit,
      updatedImpact,
      updatedImmediateAction,
      updatedActionBy,
      updatedSimilar,
      updatedSimilarDetails,
      updatedOverdueReason,
      nextVersion,
      now,
      incidentId,
    )
    .run()

  const updatedReport = await env.DB.prepare("SELECT * FROM incident_reports WHERE id = ? LIMIT 1;")
    .bind(incidentId)
    .first<IncidentReportRow>()

  return jsonResponse(updatedReport, requestId, 200, {
    ETag: `"W/${String(nextVersion)}"`,
  })
}

export const onRequestDelete: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
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
  if (!canDeleteDraft(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail:
          "Hanya pembuat draf yang dapat menghapus draf laporan. Laporan yang sudah terkirim tidak dapat dihapus.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  // Hard delete: delete incident_reports and any draft audit events (no retained audit after hard delete per workshop decision)
  await env.DB.batch([
    env.DB.prepare("DELETE FROM audit_records WHERE incident_id = ?;").bind(incidentId),
    env.DB.prepare("DELETE FROM incident_reports WHERE id = ?;").bind(incidentId),
  ])

  return jsonResponse({ deleted: true }, requestId)
}
