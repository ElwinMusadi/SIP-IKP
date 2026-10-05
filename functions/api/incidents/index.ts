import type { CloudflareEnv } from "../../../src/types/cloudflare-env"
import { createAuditPreparedStatement } from "../../_shared/audit"
import {
  firstReporterScalars,
  parseInitialReporters,
  serializeReporters,
  validateMinimumDraft,
  type IncidentReportRow,
  type IncidentTarget,
} from "../../_shared/incident-service"
import { canCreateDraft, sanitizeReportForUser } from "../../_shared/rbac"
import type { RequestContextData } from "../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../_shared/response"

export const onRequestGet: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  env,
  data,
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

  const user = auth.user
  const statusFilter = url.searchParams.get("status")

  let query = `
    SELECT
      id, report_number, status, created_by_user_id, reporter_name, reporter_role,
      owning_unit_id, patient_name, medical_record_number, patient_room, patient_age_category,
      patient_gender, patient_payer_type, admission_datetime, incident_datetime, incident_timezone,
      incident_title, chronology, incident_type, initial_reporter_category, initial_reporter_detail,
      initial_reporters,
      incident_target, incident_target_other, patient_care_type, incident_location, clinical_specialization,
      causing_unit, patient_impact, immediate_action_and_result, action_taken_by, similar_incident_occurred,
      sla_deadline_utc, is_overdue_sla, overdue_reason, risk_grade, risk_graded_at, high_risk_mitigation_notes,
      received_by_user_id, received_at, revision_reason, pmkp_reviewed, pmkp_review_notes, row_version,
      created_at, updated_at, submitted_at, completed_at
    FROM incident_reports
    WHERE owning_unit_id = 'IBS'
  `
  const params: unknown[] = []

  // Drafts are private to their creator, except for Administrator lifecycle management.
  if (user.role !== "ADMINISTRATOR") {
    query += ` AND (status != 'DRAFT' OR created_by_user_id = ?)`
    params.push(user.id)
  }

  if (statusFilter) {
    query += ` AND status = ?`
    params.push(statusFilter)
  }

  query += ` ORDER BY created_at DESC;`

  const statement = env.DB.prepare(query)
  const result = await statement.bind(...params).all()

  // Strip clinical narrative if administrator
  const items = result.results.map((row) => sanitizeReportForUser(user, row))

  return jsonResponse(items, requestId)
}

export const onRequestPost: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  env,
  data,
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

  if (!canCreateDraft(auth.user)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail: "Peran Anda tidak memiliki wewenang untuk membuat draf laporan insiden.",
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

  // Validate minimum draft requirement: (1) reporter, (2) incident date/time, (3) incident type
  const validation = validateMinimumDraft({
    reporter_name: body.reporter_name,
    reporter_role: body.reporter_role,
    incident_datetime: body.incident_datetime,
    incident_type: body.incident_type,
  })

  if (!validation.isValid || !validation.data) {
    return problemResponse(
      {
        status: 400,
        code: "MINIMUM_DRAFT_REQUIRED",
        title: "Syarat Minimum Draf Belum Terpenuhi",
        detail:
          "Draf laporan memerlukan minimal identitas pelapor, tanggal/jam insiden, dan jenis insiden.",
        instance: url.pathname,
        errors: validation.errors,
      },
      requestId,
    )
  }

  // Parse initial_reporters if provided (draft: shapes validated, empty strings allowed)
  let reportersJson: string | null = null
  let legacyCat: string | null =
    typeof body.initial_reporter_category === "string" ? body.initial_reporter_category : null
  let legacyDetail: string | null =
    typeof body.initial_reporter_detail === "string" ? body.initial_reporter_detail : null

  if (body.initial_reporters !== undefined) {
    const parsed = parseInitialReporters(body.initial_reporters, "draft")
    if (!parsed.ok) {
      return problemResponse(
        {
          status: 400,
          code: "INVALID_REPORTERS",
          title: "Data Pelapor Tidak Valid",
          detail: "Format array initial_reporters tidak valid.",
          instance: url.pathname,
          errors: parsed.errors,
        },
        requestId,
      )
    }
    reportersJson = serializeReporters(parsed.reporters)
    const scalars = firstReporterScalars(parsed.reporters)
    legacyCat = scalars.category
    legacyDetail = scalars.detail
  }

  const user = auth.user
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const incidentTarget: IncidentTarget =
    typeof body.incident_target === "string" ? (body.incident_target as IncidentTarget) : "PASIEN"

  const insertReportStmt = env.DB.prepare(
    `INSERT INTO incident_reports (
      id, status, created_by_user_id, reporter_name, reporter_role, owning_unit_id,
      patient_name, medical_record_number, patient_room, patient_age_category, patient_gender,
      patient_payer_type, admission_datetime, incident_datetime, incident_timezone, incident_title,
      chronology, incident_type, initial_reporter_category, initial_reporter_detail, initial_reporters,
      incident_target, incident_target_other, patient_care_type, incident_location, clinical_specialization,
      causing_unit, patient_impact, immediate_action_and_result, action_taken_by, similar_incident_occurred,
      similar_incident_details, row_version, created_at, updated_at
    ) VALUES (
      ?, 'DRAFT', ?, ?, ?, 'IBS',
      ?, ?, ?, ?, ?,
      ?, ?, ?, 'Asia/Makassar', ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, 1, ?, ?
    )`,
  ).bind(
    id,
    user.id,
    validation.data.reporter_name,
    validation.data.reporter_role,
    typeof body.patient_name === "string" ? body.patient_name : null,
    typeof body.medical_record_number === "string" ? body.medical_record_number : null,
    typeof body.patient_room === "string" ? body.patient_room : null,
    typeof body.patient_age_category === "string" ? body.patient_age_category : null,
    typeof body.patient_gender === "string" ? body.patient_gender : null,
    typeof body.patient_payer_type === "string" ? body.patient_payer_type : null,
    typeof body.admission_datetime === "string" ? body.admission_datetime : null,
    validation.data.incident_datetime,
    typeof body.incident_title === "string" ? body.incident_title : null,
    typeof body.chronology === "string" ? body.chronology : null,
    validation.data.incident_type,
    legacyCat,
    legacyDetail,
    reportersJson,
    incidentTarget,
    typeof body.incident_target_other === "string" ? body.incident_target_other : null,
    typeof body.patient_care_type === "string" ? body.patient_care_type : null,
    typeof body.incident_location === "string" ? body.incident_location : null,
    typeof body.clinical_specialization === "string" ? body.clinical_specialization : null,
    typeof body.causing_unit === "string" ? body.causing_unit : null,
    typeof body.patient_impact === "string" ? body.patient_impact : null,
    typeof body.immediate_action_and_result === "string" ? body.immediate_action_and_result : null,
    typeof body.action_taken_by === "string" ? body.action_taken_by : null,
    typeof body.similar_incident_occurred === "string" ? body.similar_incident_occurred : null,
    typeof body.similar_incident_details === "string" ? body.similar_incident_details : null,
    now,
    now,
  )

  const auditStmt = createAuditPreparedStatement(env.DB, {
    incidentId: id,
    eventType: "DRAFT_CREATED",
    actor: user,
    requestId,
    notes: "Draf laporan insiden pertama kali dibuat",
    occurredAt: now,
  })

  await env.DB.batch([insertReportStmt, auditStmt])

  const createdReport = await env.DB.prepare(
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
    .bind(id)
    .first<IncidentReportRow>()

  return jsonResponse(createdReport, requestId, 201)
}
