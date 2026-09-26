import type { IncidentStatus } from "./rbac"

export const INCIDENT_TYPES = ["KNC", "KTC", "KTD", "SENTINEL"] as const
export type IncidentType = (typeof INCIDENT_TYPES)[number]

export const INCIDENT_TARGETS = [
  "PASIEN",
  "KARYAWAN_NAKES",
  "PENGUNJUNG",
  "PENDAMPING",
  "KELUARGA_PASIEN",
  "LAIN_LAIN",
] as const
export type IncidentTarget = (typeof INCIDENT_TARGETS)[number]

export const RISK_GRADES = ["BIRU", "HIJAU", "KUNING", "MERAH"] as const
export type RiskGrade = (typeof RISK_GRADES)[number]

export const PATIENT_GENDERS = ["LAKI_LAKI", "PEREMPUAN"] as const
export type PatientGender = (typeof PATIENT_GENDERS)[number]

export interface MinimumDraftInput {
  reporter_name?: unknown
  reporter_role?: unknown
  incident_datetime?: unknown
  incident_type?: unknown
}

export interface ValidationError {
  path: string
  code: string
  message: string
}

export function validateMinimumDraft(input: MinimumDraftInput): {
  isValid: boolean
  errors: ValidationError[]
  data?: {
    reporter_name: string
    reporter_role: string
    incident_datetime: string
    incident_type: IncidentType
  }
} {
  const errors: ValidationError[] = []

  const reporterName = typeof input.reporter_name === "string" ? input.reporter_name.trim() : ""
  if (!reporterName) {
    errors.push({
      path: "reporter_name",
      code: "REQUIRED",
      message: "Nama pelapor wajib diisi.",
    })
  }

  const reporterRole = typeof input.reporter_role === "string" ? input.reporter_role.trim() : ""
  if (!reporterRole) {
    errors.push({
      path: "reporter_role",
      code: "REQUIRED",
      message: "Peran/profesi pelapor wajib diisi.",
    })
  }

  const incidentDatetime =
    typeof input.incident_datetime === "string" ? input.incident_datetime.trim() : ""
  if (!incidentDatetime || Number.isNaN(Date.parse(incidentDatetime))) {
    errors.push({
      path: "incident_datetime",
      code: "INVALID_DATETIME",
      message: "Tanggal dan waktu insiden wajib diisi dengan format tanggal yang valid.",
    })
  }

  const incidentType = input.incident_type as IncidentType
  if (!INCIDENT_TYPES.includes(incidentType)) {
    errors.push({
      path: "incident_type",
      code: "INVALID_ENUM",
      message: "Jenis insiden harus salah satu dari KNC, KTC, KTD, atau SENTINEL.",
    })
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    data: {
      reporter_name: reporterName,
      reporter_role: reporterRole,
      incident_datetime: incidentDatetime,
      incident_type: incidentType,
    },
  }
}

export interface IncidentReportRow {
  id: string
  report_number: string | null
  status: IncidentStatus
  created_by_user_id: string
  reporter_name: string
  reporter_role: string
  owning_unit_id: string
  patient_name: string | null
  medical_record_number: string | null
  patient_room: string | null
  patient_age_category: string | null
  patient_gender: string | null
  patient_payer_type: string | null
  admission_datetime: string | null
  incident_datetime: string
  incident_timezone: string
  incident_title: string | null
  chronology: string | null
  incident_type: IncidentType
  initial_reporter_category: string | null
  initial_reporter_detail: string | null
  incident_target: IncidentTarget
  incident_target_other: string | null
  patient_care_type: string | null
  incident_location: string | null
  clinical_specialization: string | null
  causing_unit: string | null
  patient_impact: string | null
  immediate_action_and_result: string | null
  action_taken_by: string | null
  similar_incident_occurred: string | null
  similar_incident_details: string | null
  sla_deadline_utc: string | null
  is_overdue_sla: number
  overdue_reason: string | null
  risk_grade: RiskGrade | null
  risk_graded_at: string | null
  high_risk_mitigation_notes: string | null
  received_by_user_id: string | null
  received_at: string | null
  revision_reason: string | null
  pmkp_reviewed: number
  pmkp_review_notes: string | null
  row_version: number
  created_at: string
  updated_at: string
  submitted_at: string | null
  completed_at: string | null
}

export function validateMandatorySubmitFields(report: Partial<IncidentReportRow>): {
  isValid: boolean
  errors: ValidationError[]
} {
  const errors: ValidationError[] = []

  // Bagian I: Data Pasien
  if (!report.patient_name?.trim()) {
    errors.push({ path: "patient_name", code: "REQUIRED", message: "Nama pasien wajib diisi." })
  }
  if (!report.medical_record_number?.trim()) {
    errors.push({
      path: "medical_record_number",
      code: "REQUIRED",
      message: "Nomor rekam medis pasien wajib diisi.",
    })
  }
  if (!report.patient_room?.trim()) {
    errors.push({ path: "patient_room", code: "REQUIRED", message: "Ruangan pasien wajib diisi." })
  }
  if (!report.patient_age_category?.trim()) {
    errors.push({
      path: "patient_age_category",
      code: "REQUIRED",
      message: "Kelompok umur pasien wajib dipilih.",
    })
  }
  if (!report.patient_gender || !PATIENT_GENDERS.includes(report.patient_gender as PatientGender)) {
    errors.push({
      path: "patient_gender",
      code: "REQUIRED",
      message: "Jenis kelamin pasien wajib dipilih (LAKI_LAKI / PEREMPUAN).",
    })
  }
  if (!report.patient_payer_type?.trim()) {
    errors.push({
      path: "patient_payer_type",
      code: "REQUIRED",
      message: "Penanggung biaya pasien wajib dipilih.",
    })
  }
  if (!report.admission_datetime?.trim() || Number.isNaN(Date.parse(report.admission_datetime))) {
    errors.push({
      path: "admission_datetime",
      code: "REQUIRED",
      message: "Tanggal & jam masuk RS wajib diisi dengan tanggal yang valid.",
    })
  }

  // Bagian II: Rincian Kejadian Insiden & Kronologi
  if (!report.incident_datetime?.trim() || Number.isNaN(Date.parse(report.incident_datetime))) {
    errors.push({
      path: "incident_datetime",
      code: "REQUIRED",
      message: "Tanggal & jam insiden wajib diisi dengan tanggal yang valid.",
    })
  }
  if (!report.incident_title?.trim()) {
    errors.push({ path: "incident_title", code: "REQUIRED", message: "Judul insiden wajib diisi." })
  }
  const chronology = report.chronology?.trim() ?? ""
  if (!chronology) {
    errors.push({
      path: "chronology",
      code: "REQUIRED",
      message: "Kronologi insiden (5W+1H) wajib diisi.",
    })
  } else if (chronology.length > 10_000) {
    errors.push({
      path: "chronology",
      code: "MAX_LENGTH",
      message: "Kronologi insiden tidak boleh melebihi 10.000 karakter.",
    })
  }
  if (!report.incident_type || !INCIDENT_TYPES.includes(report.incident_type)) {
    errors.push({
      path: "incident_type",
      code: "REQUIRED",
      message: "Jenis insiden wajib dipilih (KNC, KTC, KTD, atau SENTINEL).",
    })
  }
  if (!report.initial_reporter_category?.trim()) {
    errors.push({
      path: "initial_reporter_category",
      code: "REQUIRED",
      message: "Orang pertama yang melaporkan insiden wajib dipilih.",
    })
  }
  if (!report.incident_target || !INCIDENT_TARGETS.includes(report.incident_target)) {
    errors.push({
      path: "incident_target",
      code: "REQUIRED",
      message: "Insiden terjadi pada (subjek insiden) wajib dipilih.",
    })
  } else if (report.incident_target === "LAIN_LAIN" && !report.incident_target_other?.trim()) {
    errors.push({
      path: "incident_target_other",
      code: "REQUIRED",
      message: "Keterangan lain-lain untuk subjek insiden wajib diisi.",
    })
  }
  if (!report.incident_location?.trim()) {
    errors.push({
      path: "incident_location",
      code: "REQUIRED",
      message: "Tempat/lokasi kejadian insiden wajib dipilih.",
    })
  }
  if (!report.clinical_specialization?.trim()) {
    errors.push({
      path: "clinical_specialization",
      code: "REQUIRED",
      message: "Spesialisasi klinis terkait wajib dipilih.",
    })
  }
  if (!report.causing_unit?.trim()) {
    errors.push({
      path: "causing_unit",
      code: "REQUIRED",
      message: "Unit penyebab insiden wajib dipilih.",
    })
  }
  if (!report.patient_impact?.trim()) {
    errors.push({
      path: "patient_impact",
      code: "REQUIRED",
      message: "Akibat/derajat cedera insiden wajib dipilih.",
    })
  }
  if (!report.immediate_action_and_result?.trim()) {
    errors.push({
      path: "immediate_action_and_result",
      code: "REQUIRED",
      message: "Tindakan yang segera dilakukan serta hasilnya wajib diisi.",
    })
  }
  if (!report.action_taken_by?.trim()) {
    errors.push({
      path: "action_taken_by",
      code: "REQUIRED",
      message: "Pihak yang melakukan tindakan wajib dipilih.",
    })
  }
  if (!report.similar_incident_occurred?.trim()) {
    errors.push({
      path: "similar_incident_occurred",
      code: "REQUIRED",
      message:
        "Informasi apakah kejadian serupa pernah terjadi wajib dipilih (YA/TIDAK/TIDAK_TAHU).",
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function calculateSlaStatus(
  incidentDatetimeStr: string,
  now = new Date(),
): {
  deadlineUtc: string
  isOverdue: boolean
} {
  const incidentDate = new Date(incidentDatetimeStr)
  const deadlineMs = incidentDate.getTime() + 48 * 60 * 60 * 1000
  const deadlineDate = new Date(deadlineMs)

  return {
    deadlineUtc: deadlineDate.toISOString(),
    isOverdue: now.getTime() > deadlineMs,
  }
}

export async function allocateReportNumber(db: D1Database, now = new Date()): Promise<string> {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  const yearMonth = `${String(year)}${month}`
  const nowIso = now.toISOString()

  // Atomic upsert sequence counter in D1
  const result = await db
    .prepare(
      `INSERT INTO report_number_sequences (year_month, current_sequence, updated_at)
       VALUES (?, 1, ?)
       ON CONFLICT (year_month) DO UPDATE SET
         current_sequence = current_sequence + 1,
         updated_at = excluded.updated_at
       RETURNING current_sequence`,
    )
    .bind(yearMonth, nowIso)
    .first<{ current_sequence: number }>()

  const sequence = result?.current_sequence ?? 1
  return `IKP/IBS/${yearMonth}/${String(sequence).padStart(4, "0")}`
}

export interface RecommendationItem {
  text: string
  responsible: string
  target_date: string
}

export interface ActionItem {
  text: string
  responsible: string
  target_date: string
}

export interface InvestigationDataInput {
  direct_cause?: unknown
  underlying_root_cause?: unknown
  investigation_start_date?: unknown
  investigation_end_date?: unknown
  recommendations?: unknown
  actions?: unknown
}

export function validateInvestigationCompletion(input: InvestigationDataInput): {
  isValid: boolean
  errors: ValidationError[]
  data?: {
    direct_cause: string
    underlying_root_cause: string
    investigation_start_date: string
    investigation_end_date: string
    recommendations: RecommendationItem[]
    actions: ActionItem[]
  }
} {
  const errors: ValidationError[] = []

  const directCause = typeof input.direct_cause === "string" ? input.direct_cause.trim() : ""
  if (!directCause) {
    errors.push({
      path: "direct_cause",
      code: "REQUIRED",
      message: "Penyebab langsung insiden wajib diisi.",
    })
  }

  const rootCause =
    typeof input.underlying_root_cause === "string" ? input.underlying_root_cause.trim() : ""
  if (!rootCause) {
    errors.push({
      path: "underlying_root_cause",
      code: "REQUIRED",
      message: "Akar masalah insiden wajib diisi.",
    })
  }

  const startDate =
    typeof input.investigation_start_date === "string" ? input.investigation_start_date.trim() : ""
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    errors.push({
      path: "investigation_start_date",
      code: "REQUIRED",
      message: "Tanggal mulai investigasi wajib diisi dengan format YYYY-MM-DD.",
    })
  }

  const endDate =
    typeof input.investigation_end_date === "string" ? input.investigation_end_date.trim() : ""
  if (!endDate || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    errors.push({
      path: "investigation_end_date",
      code: "REQUIRED",
      message: "Tanggal selesai investigasi wajib diisi dengan format YYYY-MM-DD.",
    })
  } else if (startDate && endDate < startDate) {
    errors.push({
      path: "investigation_end_date",
      code: "DATE_ORDER",
      message: "Tanggal selesai investigasi tidak boleh mendahului tanggal mulai.",
    })
  }

  // Parse recommendations
  let parsedRecs: RecommendationItem[] = []
  if (Array.isArray(input.recommendations)) {
    parsedRecs = (input.recommendations as unknown[]).map((item) => {
      const rec = (item ?? {}) as Record<string, unknown>
      return {
        text: typeof rec.text === "string" ? rec.text.trim() : "",
        responsible: typeof rec.responsible === "string" ? rec.responsible.trim() : "",
        target_date: typeof rec.target_date === "string" ? rec.target_date.trim() : "",
      }
    })
  } else if (typeof input.recommendations === "string") {
    try {
      const raw = JSON.parse(input.recommendations) as unknown
      if (Array.isArray(raw)) {
        parsedRecs = raw.map((item) => {
          const rec = (item ?? {}) as Record<string, unknown>
          return {
            text: typeof rec.text === "string" ? rec.text.trim() : "",
            responsible: typeof rec.responsible === "string" ? rec.responsible.trim() : "",
            target_date: typeof rec.target_date === "string" ? rec.target_date.trim() : "",
          }
        })
      }
    } catch {
      // ignore JSON error
    }
  }

  if (
    parsedRecs.length === 0 ||
    !parsedRecs.some((r) => r.text && r.responsible && r.target_date)
  ) {
    errors.push({
      path: "recommendations",
      code: "REQUIRED",
      message:
        "Minimal satu rekomendasi lengkap (rekomendasi, penanggung jawab, target tanggal) wajib diisi.",
    })
  }

  // Parse actions
  let parsedActions: ActionItem[] = []
  if (Array.isArray(input.actions)) {
    parsedActions = (input.actions as unknown[]).map((item) => {
      const act = (item ?? {}) as Record<string, unknown>
      return {
        text: typeof act.text === "string" ? act.text.trim() : "",
        responsible: typeof act.responsible === "string" ? act.responsible.trim() : "",
        target_date: typeof act.target_date === "string" ? act.target_date.trim() : "",
      }
    })
  } else if (typeof input.actions === "string") {
    try {
      const raw = JSON.parse(input.actions) as unknown
      if (Array.isArray(raw)) {
        parsedActions = raw.map((item) => {
          const act = (item ?? {}) as Record<string, unknown>
          return {
            text: typeof act.text === "string" ? act.text.trim() : "",
            responsible: typeof act.responsible === "string" ? act.responsible.trim() : "",
            target_date: typeof act.target_date === "string" ? act.target_date.trim() : "",
          }
        })
      }
    } catch {
      // ignore JSON error
    }
  }

  if (
    parsedActions.length === 0 ||
    !parsedActions.some((a) => a.text && a.responsible && a.target_date)
  ) {
    errors.push({
      path: "actions",
      code: "REQUIRED",
      message:
        "Minimal satu tindakan perbaikan lengkap (tindakan, penanggung jawab, target tanggal) wajib diisi.",
    })
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    data: {
      direct_cause: directCause,
      underlying_root_cause: rootCause,
      investigation_start_date: startDate,
      investigation_end_date: endDate,
      recommendations: parsedRecs,
      actions: parsedActions,
    },
  }
}
