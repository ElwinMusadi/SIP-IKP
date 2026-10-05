import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import { createAuditPreparedStatement } from "../../../_shared/audit"
import {
  SLA_ENABLED,
  allocateReportNumber,
  calculateSlaStatus,
  resolveReportersFromRow,
  validateMandatorySubmitFields,
  type IncidentReportRow,
  type InitialReporter,
} from "../../../_shared/incident-service"
import { canSubmitReport } from "../../../_shared/rbac"
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
  const report = await env.DB.prepare(
    `SELECT
       id, report_number, status, created_by_user_id, reporter_name, reporter_role,
       owning_unit_id, patient_name, medical_record_number, patient_room, patient_age_category,
       patient_gender, patient_payer_type, admission_datetime, incident_datetime, incident_timezone,
       incident_title, chronology, incident_type, initial_reporter_category, initial_reporter_detail,
       initial_reporters,
       incident_target, incident_target_other, patient_care_type, incident_location, clinical_specialization,
       causing_unit, patient_impact, immediate_action_and_result, action_taken_by, similar_incident_occurred,
       similar_incident_details, sla_deadline_utc, is_overdue_sla, overdue_reason, risk_grade,
       risk_graded_at, high_risk_mitigation_notes, received_by_user_id, received_at, revision_reason,
       pmkp_reviewed, pmkp_review_notes, row_version, created_at, updated_at, submitted_at, completed_at
     FROM incident_reports WHERE id = ? LIMIT 1;`,
  )
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
  if (!canSubmitReport(user, report)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail:
          "Hanya pembuat draf yang dapat mengirimkan laporan resmi. Laporan yang sudah dikirim tidak dapat dikirimkan ulang kecuali diminta revisi.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  // Resolve reporters: prefer JSON column, fall back to legacy scalars
  const resolvedReporters: InitialReporter[] = resolveReportersFromRow(report)

  // 1. Validate stored JSON strictly, exempting names only on genuine legacy scalar rows.
  const validation = validateMandatorySubmitFields(report)
  if (!validation.isValid) {
    return problemResponse(
      {
        status: 422,
        code: "MANDATORY_FIELDS_INCOMPLETE",
        title: "Kelengkapan Formulir Belum Memenuhi Syarat",
        detail:
          "Seluruh field wajib pada Bagian I (Data Pasien) dan Bagian II (Rincian Kejadian) harus lengkap sebelum laporan dapat dikirim.",
        instance: url.pathname,
        errors: validation.errors,
      },
      requestId,
    )
  }

  // 2. SLA 48h calculation (retained for record-keeping even when SLA_ENABLED=false)
  const now = new Date()
  const nowIso = now.toISOString()
  const sla = calculateSlaStatus(report.incident_datetime, now)

  // SLA enforcement gate — only blocks submission when SLA_ENABLED=true
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (SLA_ENABLED && sla.isOverdue && !report.overdue_reason?.trim()) {
    return problemResponse(
      {
        status: 422,
        code: "OVERDUE_REASON_REQUIRED",
        title: "Alasan Keterlambatan Wajib Diisi",
        detail:
          "Waktu pelaporan telah melebihi batas waktu 2x24 jam (48 jam) sejak insiden terjadi. Alasan keterlambatan pelaporan wajib diisi.",
        instance: url.pathname,
        errors: [
          {
            path: "overdue_reason",
            code: "REQUIRED_WHEN_OVERDUE",
            message: "Alasan keterlambatan wajib diisi karena pelaporan melewati 48 jam.",
          },
        ],
      },
      requestId,
    )
  }

  // 3. Allocate report number if not already present
  const reportNumber = report.report_number || (await allocateReportNumber(env.DB, now))
  const isResubmission = report.status === "REVISION_REQUIRED"
  const nextVersion = report.row_version + 1

  // Do not materialize JSON array on submit for pure legacy records
  const finalReportersJson: string | null = report.initial_reporters ?? null
  const finalCat = report.initial_reporter_category ?? null
  const finalDetail = report.initial_reporter_detail ?? null

  // 4. Atomic D1 Batch:
  // a) Update incident_reports — also write final reporters JSON + sync scalars
  const updateReportStmt = env.DB.prepare(
    `UPDATE incident_reports SET
      status = 'SUBMITTED',
      report_number = ?,
      submitted_at = ?,
      sla_deadline_utc = ?,
      is_overdue_sla = ?,
      initial_reporters = ?,
      initial_reporter_category = ?,
      initial_reporter_detail = ?,
      row_version = ?,
      updated_at = ?
    WHERE id = ?`,
  ).bind(
    reportNumber,
    nowIso,
    sla.deadlineUtc,
    sla.isOverdue ? 1 : 0,
    finalReportersJson,
    finalCat,
    finalDetail,
    nextVersion,
    nowIso,
    incidentId,
  )

  // b) Snapshot record — snapshot_data carries the full array (parsed object, not string)
  const snapshotId = crypto.randomUUID()
  const snapshotData = JSON.stringify({
    ...report,
    report_number: reportNumber,
    status: "SUBMITTED",
    submitted_at: nowIso,
    sla_deadline_utc: sla.deadlineUtc,
    is_overdue_sla: sla.isOverdue ? 1 : 0,
    // Override with parsed array so snapshot consumers get the full structure
    initial_reporters: resolvedReporters,
    initial_reporter_category: finalCat,
    initial_reporter_detail: finalDetail,
    submitted_by: {
      id: user.id,
      fullName: user.fullName,
      role: user.role,
      profession: user.profession,
      unitId: user.unitId,
    },
  })

  const snapshotStmt = env.DB.prepare(
    `INSERT INTO incident_submission_snapshots (
      id, incident_id, report_number, snapshot_data, patient_name, medical_record_number,
      incident_datetime, incident_type, is_overdue_sla, overdue_reason,
      submitted_by_user_id, submitted_at, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
    ON CONFLICT (incident_id) DO UPDATE SET
      report_number = excluded.report_number,
      snapshot_data = excluded.snapshot_data,
      patient_name = excluded.patient_name,
      medical_record_number = excluded.medical_record_number,
      incident_datetime = excluded.incident_datetime,
      incident_type = excluded.incident_type,
      is_overdue_sla = excluded.is_overdue_sla,
      overdue_reason = excluded.overdue_reason,
      submitted_by_user_id = excluded.submitted_by_user_id,
      submitted_at = excluded.submitted_at,
      updated_at = excluded.updated_at`,
  ).bind(
    snapshotId,
    incidentId,
    reportNumber,
    snapshotData,
    report.patient_name,
    report.medical_record_number,
    report.incident_datetime,
    report.incident_type,
    sla.isOverdue ? 1 : 0,
    report.overdue_reason,
    user.id,
    nowIso,
    nowIso,
    nowIso,
  )

  // c) Audit event (REPORT_SUBMITTED for both initial submit and resubmit per workshop decision)
  const auditStmt = createAuditPreparedStatement(env.DB, {
    incidentId,
    eventType: "REPORT_SUBMITTED",
    actor: user,
    requestId,
    notes: isResubmission
      ? "Laporan insiden dikirim kembali setelah perbaikan/revisi"
      : "Laporan insiden resmi dikirimkan",
    occurredAt: nowIso,
  })

  await env.DB.batch([updateReportStmt, snapshotStmt, auditStmt])

  const submittedReport = await env.DB.prepare(
    `SELECT
       id, report_number, status, created_by_user_id, reporter_name, reporter_role,
       owning_unit_id, patient_name, medical_record_number, patient_room, patient_age_category,
       patient_gender, patient_payer_type, admission_datetime, incident_datetime, incident_timezone,
       incident_title, chronology, incident_type, initial_reporter_category, initial_reporter_detail,
       initial_reporters,
       incident_target, incident_target_other, patient_care_type, incident_location, clinical_specialization,
       causing_unit, patient_impact, immediate_action_and_result, action_taken_by, similar_incident_occurred,
       similar_incident_details, sla_deadline_utc, is_overdue_sla, overdue_reason, risk_grade,
       risk_graded_at, high_risk_mitigation_notes, received_by_user_id, received_at, revision_reason,
       pmkp_reviewed, pmkp_review_notes, row_version, created_at, updated_at, submitted_at, completed_at
     FROM incident_reports WHERE id = ? LIMIT 1;`,
  )
    .bind(incidentId)
    .first<IncidentReportRow>()

  return jsonResponse(submittedReport, requestId, 200, {
    ETag: `"W/${String(nextVersion)}"`,
  })
}
