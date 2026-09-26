export type IncidentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVISION_REQUIRED"
  | "UNDER_REVIEW"
  | "SIMPLE_INVESTIGATION"
  | "PMKP_REVIEW"
  | "COMPLETED_BY_UNIT"
  | "COMPLETED"

export type IncidentType = "KNC" | "KTC" | "KTD" | "SENTINEL"

export type IncidentTarget =
  "PASIEN" | "KARYAWAN_NAKES" | "PENGUNJUNG" | "PENDAMPING" | "KELUARGA_PASIEN" | "LAIN_LAIN"

export type RiskGrade = "BIRU" | "HIJAU" | "KUNING" | "MERAH"

export type PatientGender = "LAKI_LAKI" | "PEREMPUAN"

export interface MasterItem {
  id: string
  name: string
  code: string
}

export interface MasterDataPayload {
  operatingRooms: MasterItem[]
  specializations: MasterItem[]
  departments: MasterItem[]
  payerTypes: MasterItem[]
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

export interface SimpleInvestigation {
  id: string
  incident_id: string
  direct_cause: string | null
  underlying_root_cause: string | null
  investigation_start_date: string | null
  investigation_end_date: string | null
  recommendations: string | RecommendationItem[]
  actions: string | ActionItem[]
  completed_by_user_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface AuditRecord {
  id: string
  eventType: string
  actorName: string
  actorRole: string
  occurredAt: string
  notes: string | null
  requestId: string
}

export interface IncidentReport {
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
  patient_gender: PatientGender | null
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
  similar_incident_details?: string | null
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
  investigation?: SimpleInvestigation | null
  submissionSnapshot?: Record<string, unknown> | null
}
