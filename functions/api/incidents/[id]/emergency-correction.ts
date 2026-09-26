import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import { createAuditPreparedStatement } from "../../../_shared/audit"
import type { IncidentReportRow } from "../../../_shared/incident-service"
import { canEmergencyCorrect } from "../../../_shared/rbac"
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
  if (!canEmergencyCorrect(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Koreksi Darurat Ditolak",
        detail:
          "Koreksi Darurat hanya diizinkan untuk Kepala Ruangan IBS pada status SUBMITTED atau UNDER_REVIEW. Dilarang setelah Simple Investigation, PMKP Review, atau penyelesaian.",
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

  // Reason is mandatory, free-text 1–500 chars after trim
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!reason || reason.length > 500) {
    return problemResponse(
      {
        status: 422,
        code: "CORRECTION_REASON_REQUIRED",
        title: "Alasan Koreksi Darurat Wajib Diisi",
        detail: "Alasan koreksi darurat wajib diisi dengan panjang antara 1 hingga 500 karakter.",
        instance: url.pathname,
        errors: [
          {
            path: "reason",
            code: "LENGTH_1_TO_500",
            message: "Alasan koreksi darurat harus antara 1 dan 500 karakter.",
          },
        ],
      },
      requestId,
    )
  }

  const nowIso = new Date().toISOString()
  const nextVersion = report.row_version + 1

  // Extract updated fields
  const fields =
    typeof body.fields === "object" && body.fields !== null
      ? (body.fields as Record<string, unknown>)
      : body
  const updatedPatientName =
    fields.patient_name !== undefined ? (fields.patient_name as string) : report.patient_name
  const updatedMr =
    fields.medical_record_number !== undefined
      ? (fields.medical_record_number as string)
      : report.medical_record_number
  const updatedRoom =
    fields.patient_room !== undefined ? (fields.patient_room as string) : report.patient_room
  const updatedAgeCat =
    fields.patient_age_category !== undefined
      ? (fields.patient_age_category as string)
      : report.patient_age_category
  const updatedGender =
    fields.patient_gender !== undefined ? (fields.patient_gender as string) : report.patient_gender
  const updatedPayer =
    fields.patient_payer_type !== undefined
      ? (fields.patient_payer_type as string)
      : report.patient_payer_type
  const updatedAdmission =
    fields.admission_datetime !== undefined
      ? (fields.admission_datetime as string)
      : report.admission_datetime
  const updatedIncidentDatetime =
    typeof fields.incident_datetime === "string"
      ? fields.incident_datetime
      : report.incident_datetime
  const updatedIncidentTitle =
    fields.incident_title !== undefined ? (fields.incident_title as string) : report.incident_title
  const updatedChronology =
    fields.chronology !== undefined ? (fields.chronology as string) : report.chronology
  const updatedIncidentType =
    typeof fields.incident_type === "string" ? fields.incident_type : report.incident_type
  const updatedReporterCat =
    fields.initial_reporter_category !== undefined
      ? (fields.initial_reporter_category as string)
      : report.initial_reporter_category
  const updatedReporterDetail =
    fields.initial_reporter_detail !== undefined
      ? (fields.initial_reporter_detail as string)
      : report.initial_reporter_detail
  const updatedIncidentTarget =
    typeof fields.incident_target === "string" ? fields.incident_target : report.incident_target
  const updatedTargetOther =
    fields.incident_target_other !== undefined
      ? (fields.incident_target_other as string)
      : report.incident_target_other
  const updatedCareType =
    fields.patient_care_type !== undefined
      ? (fields.patient_care_type as string)
      : report.patient_care_type
  const updatedLocation =
    fields.incident_location !== undefined
      ? (fields.incident_location as string)
      : report.incident_location
  const updatedSpecialization =
    fields.clinical_specialization !== undefined
      ? (fields.clinical_specialization as string)
      : report.clinical_specialization
  const updatedCausingUnit =
    fields.causing_unit !== undefined ? (fields.causing_unit as string) : report.causing_unit
  const updatedImpact =
    fields.patient_impact !== undefined ? (fields.patient_impact as string) : report.patient_impact
  const updatedImmediateAction =
    fields.immediate_action_and_result !== undefined
      ? (fields.immediate_action_and_result as string)
      : report.immediate_action_and_result
  const updatedActionBy =
    fields.action_taken_by !== undefined
      ? (fields.action_taken_by as string)
      : report.action_taken_by
  const updatedSimilar =
    fields.similar_incident_occurred !== undefined
      ? (fields.similar_incident_occurred as string)
      : report.similar_incident_occurred
  const updatedOverdueReason =
    fields.overdue_reason !== undefined ? (fields.overdue_reason as string) : report.overdue_reason
  const updatedRiskGrade =
    fields.risk_grade !== undefined ? (fields.risk_grade as string) : report.risk_grade

  const statements: D1PreparedStatement[] = []

  // 1. Update incident_reports
  statements.push(
    env.DB.prepare(
      `UPDATE incident_reports SET
        patient_name = ?, medical_record_number = ?, patient_room = ?,
        patient_age_category = ?, patient_gender = ?, patient_payer_type = ?,
        admission_datetime = ?, incident_datetime = ?, incident_title = ?,
        chronology = ?, incident_type = ?, initial_reporter_category = ?,
        initial_reporter_detail = ?, incident_target = ?, incident_target_other = ?,
        patient_care_type = ?, incident_location = ?, clinical_specialization = ?,
        causing_unit = ?, patient_impact = ?, immediate_action_and_result = ?,
        action_taken_by = ?, similar_incident_occurred = ?, overdue_reason = ?,
        risk_grade = ?, row_version = ?, updated_at = ?
      WHERE id = ?`,
    ).bind(
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
      updatedOverdueReason,
      updatedRiskGrade,
      nextVersion,
      nowIso,
      incidentId,
    ),
  )

  // 2. Also update formal submission snapshot per workshop decision #164
  statements.push(
    env.DB.prepare(
      `UPDATE incident_submission_snapshots SET
        patient_name = ?, medical_record_number = ?, incident_datetime = ?,
        incident_type = ?, overdue_reason = ?, updated_at = ?
      WHERE incident_id = ?`,
    ).bind(
      updatedPatientName,
      updatedMr,
      updatedIncidentDatetime,
      updatedIncidentType,
      updatedOverdueReason,
      nowIso,
      incidentId,
    ),
  )

  // 3. Insert EMERGENCY_CORRECTION audit record (one event only)
  statements.push(
    createAuditPreparedStatement(env.DB, {
      incidentId,
      eventType: "EMERGENCY_CORRECTION",
      actor: user,
      requestId,
      notes: reason,
      occurredAt: nowIso,
    }),
  )

  await env.DB.batch(statements)

  const updatedReport = await env.DB.prepare("SELECT * FROM incident_reports WHERE id = ? LIMIT 1;")
    .bind(incidentId)
    .first<IncidentReportRow>()

  return jsonResponse(updatedReport, requestId, 200, {
    ETag: `"W/${String(nextVersion)}"`,
  })
}
