import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import { createAuditPreparedStatement } from "../../../_shared/audit"
import {
  allocateReportNumber,
  calculateSlaStatus,
  validateMandatorySubmitFields,
  type IncidentReportRow,
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

  // 1. Validate all mandatory Form fields
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

  // 2. SLA 48h calculation
  const now = new Date()
  const nowIso = now.toISOString()
  const sla = calculateSlaStatus(report.incident_datetime, now)

  if (sla.isOverdue && !report.overdue_reason?.trim()) {
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

  // 4. Atomic D1 Batch:
  // a) Update incident_reports
  const updateReportStmt = env.DB.prepare(
    `UPDATE incident_reports SET
      status = 'SUBMITTED',
      report_number = ?,
      submitted_at = ?,
      sla_deadline_utc = ?,
      is_overdue_sla = ?,
      row_version = ?,
      updated_at = ?
    WHERE id = ?`,
  ).bind(
    reportNumber,
    nowIso,
    sla.deadlineUtc,
    sla.isOverdue ? 1 : 0,
    nextVersion,
    nowIso,
    incidentId,
  )

  // b) Snapshot record
  const snapshotId = crypto.randomUUID()
  const snapshotData = JSON.stringify({
    ...report,
    report_number: reportNumber,
    status: "SUBMITTED",
    submitted_at: nowIso,
    sla_deadline_utc: sla.deadlineUtc,
    is_overdue_sla: sla.isOverdue ? 1 : 0,
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
    "SELECT * FROM incident_reports WHERE id = ? LIMIT 1;",
  )
    .bind(incidentId)
    .first<IncidentReportRow>()

  return jsonResponse(submittedReport, requestId, 200, {
    ETag: `"W/${String(nextVersion)}"`,
  })
}
