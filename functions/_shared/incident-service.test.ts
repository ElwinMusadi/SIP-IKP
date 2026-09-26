import { describe, expect, it } from "vitest"

import {
  allocateReportNumber,
  calculateSlaStatus,
  validateInvestigationCompletion,
  validateMandatorySubmitFields,
  validateMinimumDraft,
  type IncidentReportRow,
} from "./incident-service"

describe("Incident Service & Domain Validation", () => {
  describe("Minimum Draft Validation", () => {
    it("accepts valid minimum draft input", () => {
      const result = validateMinimumDraft({
        reporter_name: "Ns. Maria",
        reporter_role: "Perawat Bedah",
        incident_datetime: "2026-09-26T10:00",
        incident_type: "KNC",
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toEqual({
        reporter_name: "Ns. Maria",
        reporter_role: "Perawat Bedah",
        incident_datetime: "2026-09-26T10:00",
        incident_type: "KNC",
      })
    })

    it("rejects empty draft input", () => {
      const result = validateMinimumDraft({})
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(3)
    })

    it("rejects invalid incident_type enum", () => {
      const result = validateMinimumDraft({
        reporter_name: "Ns. Maria",
        reporter_role: "Perawat Bedah",
        incident_datetime: "2026-09-26T10:00",
        incident_type: "INVALID_TYPE",
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.path === "incident_type")).toBe(true)
    })
  })

  describe("SLA 48h Calculation", () => {
    it("marks report within 48h as on-time (isOverdue = false)", () => {
      const incidentTime = "2026-09-26T08:00:00.000Z"
      const submitTime = new Date("2026-09-27T12:00:00.000Z") // 28 hours later

      const sla = calculateSlaStatus(incidentTime, submitTime)
      expect(sla.isOverdue).toBe(false)
      expect(sla.deadlineUtc).toBe("2026-09-28T08:00:00.000Z")
    })

    it("marks report at exactly 48h as on-time", () => {
      const incidentTime = "2026-09-26T08:00:00.000Z"
      const submitTime = new Date("2026-09-28T08:00:00.000Z") // exactly 48h

      const sla = calculateSlaStatus(incidentTime, submitTime)
      expect(sla.isOverdue).toBe(false)
    })

    it("marks report after 48h as overdue (isOverdue = true)", () => {
      const incidentTime = "2026-09-26T08:00:00.000Z"
      const submitTime = new Date("2026-09-28T08:00:01.000Z") // 48h + 1s

      const sla = calculateSlaStatus(incidentTime, submitTime)
      expect(sla.isOverdue).toBe(true)
    })
  })

  describe("Mandatory Submission Validation", () => {
    const completeReport: Partial<IncidentReportRow> = {
      patient_name: "PATIENT TEST 01",
      medical_record_number: "MR-12345",
      patient_room: "OK 2 (Ortopedi)",
      patient_age_category: ">30_65_tahun",
      patient_gender: "LAKI_LAKI",
      patient_payer_type: "BPJS Kesehatan",
      admission_datetime: "2026-09-25T07:00:00.000Z",
      incident_datetime: "2026-09-26T09:30:00.000Z",
      incident_title: "Insiden salah identifikasi sisi",
      chronology: "Urutan kejadian lengkap 5W+1H...",
      incident_type: "KNC",
      initial_reporter_category: "Karyawan: Perawat",
      incident_target: "PASIEN",
      incident_location: "Kamar Operasi 2 (Ortopedi)",
      clinical_specialization: "Bedah Ortopedi & Traumatologi",
      causing_unit: "Instalasi Bedah Sentral (IBS)",
      patient_impact: "Tidak Ada Cedera",
      immediate_action_and_result: "Dilakukan verifikasi ulang",
      action_taken_by: "Dokter Operator / DPJP",
      similar_incident_occurred: "TIDAK",
    }

    it("passes when all mandatory Form fields are complete", () => {
      const result = validateMandatorySubmitFields(completeReport)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("fails when patient demographics are missing", () => {
      const incomplete = { ...completeReport, patient_name: "" }
      const result = validateMandatorySubmitFields(incomplete)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.path === "patient_name")).toBe(true)
    })

    it("fails when incident_target is LAIN_LAIN but other text is missing", () => {
      const invalidTarget = {
        ...completeReport,
        incident_target: "LAIN_LAIN" as const,
        incident_target_other: "",
      }
      const result = validateMandatorySubmitFields(invalidTarget)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.path === "incident_target_other")).toBe(true)
    })

    it("fails when chronology exceeds 10,000 characters", () => {
      const longChronology = { ...completeReport, chronology: "x".repeat(10_001) }
      const result = validateMandatorySubmitFields(longChronology)
      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.path === "chronology")).toBe(true)
    })
  })

  describe("Simple Investigation Completion Validation", () => {
    it("passes when all investigation fields and tables are complete", () => {
      const result = validateInvestigationCompletion({
        direct_cause: "Komunikasi kurang efektif",
        underlying_root_cause: "SOP check-in belum optimal",
        investigation_start_date: "2026-09-26",
        investigation_end_date: "2026-09-28",
        recommendations: [
          {
            text: "Sosialisasi ulang checklist bedah",
            responsible: "Kepala Ruangan",
            target_date: "2026-10-01",
          },
        ],
        actions: [
          {
            text: "Briefing sebelum pembedahan dimulai",
            responsible: "Perawat Primer",
            target_date: "2026-09-29",
          },
        ],
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("rejects when investigation_end_date is before start_date", () => {
      const result = validateInvestigationCompletion({
        direct_cause: "Direct Cause",
        underlying_root_cause: "Root Cause",
        investigation_start_date: "2026-09-28",
        investigation_end_date: "2026-09-26", // end < start
        recommendations: [{ text: "R1", responsible: "Resp", target_date: "2026-10-01" }],
        actions: [{ text: "A1", responsible: "Resp", target_date: "2026-10-01" }],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.code === "DATE_ORDER")).toBe(true)
    })

    it("rejects when recommendations or actions arrays are empty", () => {
      const result = validateInvestigationCompletion({
        direct_cause: "Cause",
        underlying_root_cause: "Root",
        investigation_start_date: "2026-09-26",
        investigation_end_date: "2026-09-28",
        recommendations: [],
        actions: [],
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.path === "recommendations")).toBe(true)
      expect(result.errors.some((e) => e.path === "actions")).toBe(true)
    })
  })

  describe("Atomic Report Number Allocation", () => {
    it("allocates sequential human-readable report numbers (IKP/IBS/YYYYMM/XXXX)", async () => {
      let currentSeq = 0
      const mockDb = {
        prepare: () => ({
          bind: () => ({
            first: async () => {
              currentSeq += 1
              return { current_sequence: currentSeq }
            },
          }),
        }),
      } as unknown as D1Database

      const now = new Date("2026-09-26T12:00:00.000Z")
      const num1 = await allocateReportNumber(mockDb, now)
      const num2 = await allocateReportNumber(mockDb, now)

      expect(num1).toBe("IKP/IBS/202609/0001")
      expect(num2).toBe("IKP/IBS/202609/0002")
    })
  })
})
