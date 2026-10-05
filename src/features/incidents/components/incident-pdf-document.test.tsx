import { pdf } from "@react-pdf/renderer"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { AuditRecord, IncidentReport, SimpleInvestigation } from "../types/incident"
import { IncidentPdfDocument } from "./incident-pdf-document"
import { HeadRoomReviewPanel } from "./head-room-review-panel"
import { InitialReportersList } from "./initial-reporters-list"

async function pdfText(bytes: Uint8Array): Promise<string> {
  const raw = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")
  const streams = await Promise.all(Array.from(raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)).map(async (match) => {
    try {
      const compressed = Uint8Array.from(match[1] ?? "", (character) => character.charCodeAt(0))
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate"))
      const content = await new Response(stream).text()
      return Array.from(content.matchAll(/<([0-9a-f]+)>/gi)).map((part) =>
        (part[1]?.match(/../g) ?? []).map((hex) => String.fromCharCode(Number.parseInt(hex, 16))).join(""),
      ).join("")
    } catch {
      return ""
    }
  }))
  return streams.join("\n")
}

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
    expect(await pdfText(bytes)).toContain("PETUGAS")
    expect(await pdfText(bytes)).toContain("Tidak tercatat")
  })

  it("renders every reporter and paginates a list longer than one page without clinical guidance", async () => {
    const initial_reporters = Array.from({ length: 70 }, (_, index) => ({
      name: `Reporter-identity-${(index + 1).toString()}-END`,
      category: `Reporter-category-${(index + 1).toString()}-END`,
      detail: `Reporter-detail-${(index + 1).toString()}-END`,
    }))
    const blob = await pdf(IncidentPdfDocument({
      auditRecords: [], investigation: null, printedAt: "2026-10-01T03:05:00.000Z",
      report: { ...report, initial_reporters: JSON.stringify(initial_reporters) },
    })).toBlob()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const text = await pdfText(bytes)
    for (const reporter of initial_reporters) {
      expect(text).toContain(reporter.name)
      expect(text).toContain(reporter.category)
      expect(text).toContain(reporter.detail)
    }
    expect(text).not.toContain("Katastropik")
    expect(text).not.toContain("Referensi Penilaian Dampak Klinis")
    expect(text).not.toContain("Tidak tercatat")
    expect(new TextDecoder().decode(bytes).match(/\/Type \/Page\b/g)?.length).toBeGreaterThan(3)
  }, 20_000)

  it("renders a single reporter with detail longer than a page without dropping the final text", async () => {
    const blob = await pdf(IncidentPdfDocument({
      auditRecords: [], investigation: null, printedAt: "2026-10-01T03:05:00.000Z",
      report: { ...report, initial_reporters: [{ name: "Long Reporter", category: "Pasien", detail: `${"Extended optional detail. ".repeat(700)}LAST-DETAIL-END` }] },
    })).toBlob()
    expect(await pdfText(new Uint8Array(await blob.arrayBuffer()))).toContain("LAST-DETAIL-END")
  }, 20_000)
})

describe("reporter display and grading reference", () => {
  const callbacks = {
    onReceive: async () => {}, onRequestRevision: async () => {}, onAssignRiskGrade: async () => {},
    onStartInvestigation: async () => {}, onSkipInvestigation: async () => {}, onOpenEmergencyCorrection: () => {},
  }

  it("renders structured, escaped multi-reporter HTML for detail and print", () => {
    const html = renderToStaticMarkup(InitialReportersList({ report: {
      ...report, initial_reporters: [
        { name: "<Ana>", category: "Pasien", detail: "" },
        { name: "Budi", category: "Pengunjung", detail: "Saksi" },
        { name: "Citra", category: "Karyawan: Perawat", detail: "Malam" },
      ],
    } }))
    expect(html).toContain("Pelapor 3")
    expect(html).toContain("&lt;Ana&gt;")
    expect(html).toContain("Kategori: ")
    expect(html).toContain("Detail: ")
    expect(html).toContain("Malam")
    expect(html).not.toContain("Referensi Penilaian Dampak Klinis")
    expect(html).not.toContain("Katastropik")
    const legacyHtml = renderToStaticMarkup(InitialReportersList({ report }))
    expect(legacyHtml).toContain("Tidak tercatat")
    expect(legacyHtml).toContain("PETUGAS")
  })

  it("shows all clinical levels only while risk grading is visible", () => {
    const visible = renderToStaticMarkup(<HeadRoomReviewPanel {...callbacks} report={{ ...report, status: "UNDER_REVIEW", risk_grade: null }} />)
    for (const name of ["Tidak signifikan", "Minor", "Moderat", "Mayor", "Katastropik"]) expect(visible).toContain(name)
    for (const text of ["Tidak ada cedera", "luka lecet", "pertolongan pertama", "luka robek", "reversibel", "memperpanjang perawatan", "cacat, lumpuh", "irreversibel", "Kematian yang tidak berhubungan"]) expect(visible).toContain(text)
    expect(visible).toContain("tidak otomatis menentukan pita grading risiko")
    expect(visible).toContain("table-fixed")
    expect(visible).toContain("md:hidden")
    for (const status of ["DRAFT", "REVISION_REQUIRED", "SUBMITTED", "SIMPLE_INVESTIGATION", "COMPLETED_BY_UNIT", "COMPLETED"] as const) {
      const hidden = renderToStaticMarkup(<HeadRoomReviewPanel {...callbacks} report={{ ...report, status }} />)
      expect(hidden).not.toContain("Referensi Penilaian Dampak Klinis")
    }
    for (const risk_grade of ["BIRU", "HIJAU"] as const) {
      const decision = renderToStaticMarkup(<HeadRoomReviewPanel {...callbacks} report={{ ...report, status: "UNDER_REVIEW", risk_grade }} />)
      expect(decision).not.toContain("Referensi Penilaian Dampak Klinis")
    }
  })
})
