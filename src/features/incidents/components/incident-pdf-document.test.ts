import { pdf } from "@react-pdf/renderer"
import { describe, expect, it } from "vitest"

import type { AuditRecord, IncidentReport, SimpleInvestigation } from "../types/incident"
import { IncidentPdfDocument } from "./incident-pdf-document"

const report: IncidentReport = {
  id: "incident-fixture-1",
  report_number: "IKP/IBS/2026/001",
  status: "SIMPLE_INVESTIGATION",
  created_by_user_id: "user-1",
  reporter_name: "Perawat Penguji",
  reporter_role: "PERAWAT",
  owning_unit_id: "unit-ibs",
  patient_name: "Pasien Uji",
  medical_record_number: "RM-0001",
  patient_room: "IBS • Kamar Operasi 1",
  patient_age_category: "DEWASA",
  patient_gender: "PEREMPUAN",
  patient_payer_type: null,
  admission_datetime: "2026-09-30T22:15:00.000Z",
  incident_datetime: "2026-10-01T01:30:00.000Z",
  incident_timezone: "Asia/Makassar",
  incident_title: "Ketidaksesuaian alat — segera ditangani",
  chronology: "Saat sign-in, tim menemukan alat tidak sesuai. Alat diganti sebelum tindakan.",
  incident_type: "KNC",
  initial_reporter_category: "PETUGAS",
  initial_reporter_detail: null,
  incident_target: "PASIEN",
  incident_target_other: null,
  patient_care_type: "RAWAT_INAP",
  incident_location: "Kamar Operasi 1",
  clinical_specialization: "Bedah Umum",
  causing_unit: "IBS",
  patient_impact: "TIDAK_ADA_CEDERA",
  immediate_action_and_result: "Alat diganti — tindakan berjalan aman.",
  action_taken_by: "Tim IBS",
  similar_incident_occurred: "TIDAK",
  similar_incident_details: null,
  sla_deadline_utc: "2026-10-03T01:30:00.000Z",
  is_overdue_sla: 0,
  overdue_reason: null,
  risk_grade: "BIRU",
  risk_graded_at: "2026-10-01T02:00:00.000Z",
  high_risk_mitigation_notes: null,
  received_by_user_id: "user-2",
  received_at: "2026-10-01T02:00:00.000Z",
  revision_reason: null,
  pmkp_reviewed: 0,
  pmkp_review_notes: null,
  row_version: 2,
  created_at: "2026-10-01T01:45:00.000Z",
  updated_at: "2026-10-01T03:00:00.000Z",
  submitted_at: "2026-10-01T01:50:00.000Z",
  completed_at: null,
}

const investigation: SimpleInvestigation = {
  id: "investigation-1",
  incident_id: report.id,
  direct_cause: "Pengecekan awal belum lengkap.",
  underlying_root_cause: "Daftar periksa belum memuat identitas alat secara rinci.",
  investigation_start_date: "2026-10-01",
  investigation_end_date: null,
  recommendations: [
    {
      text: "Perbarui daftar periksa • verifikasi dua petugas.",
      responsible: "Kepala Ruangan IBS",
      target_date: "2026-10-07",
    },
  ],
  actions: JSON.stringify([
    {
      text: "Sosialisasi daftar periksa — seluruh tim.",
      responsible: "Koordinator Tim",
      target_date: "2026-10-08",
    },
  ]),
  completed_by_user_id: null,
  completed_at: null,
  created_at: "2026-10-01T02:10:00.000Z",
  updated_at: "2026-10-01T03:00:00.000Z",
}

const auditRecords: AuditRecord[] = [
  {
    id: "audit-1",
    eventType: "REPORT_SUBMITTED",
    actorName: "Perawat Penguji",
    actorRole: "PERAWAT",
    occurredAt: "2026-10-01T01:50:00.000Z",
    notes: "Dikirim untuk verifikasi — data lengkap.",
    requestId: "request-1",
  },
]

describe("IncidentPdfDocument", () => {
  it("renders a realistic incident as valid PDF bytes", async () => {
    const document = IncidentPdfDocument({
      auditRecords,
      investigation,
      printedAt: "2026-10-01T03:05:00.000Z",
      report,
    })

    const blob = await pdf(document).toBlob()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const signature = new TextDecoder("ascii").decode(bytes.slice(0, 5))

    expect(blob.type).toBe("application/pdf")
    expect(bytes.byteLength).toBeGreaterThan(1_000)
    expect(signature).toBe("%PDF-")
  })
})
