import { useEffect, useState } from "react"
import {
  IconAlertCircle,
  IconArrowLeft,
  IconHeartbeat,
  IconPrinter,
  IconRefresh,
  IconShieldLock,
} from "@tabler/icons-react"
import { useNavigate, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { fetchIncidentPrint } from "../api/incidents-api"
import type {
  ActionItem,
  AuditRecord,
  IncidentReport,
  RecommendationItem,
  SimpleInvestigation,
} from "../types/incident"

function parseTableRows<T>(raw?: string | T[]): T[] {
  if (Array.isArray(raw)) {
    return raw
  }
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw || "[]")
      if (Array.isArray(parsed)) {
        return parsed as T[]
      }
    } catch {
      // ignore
    }
  }
  return []
}

function formatStatusText(status: string): string {
  switch (status) {
    case "DRAFT":
      return "DRAF — BELUM MENJADI LAPORAN RESMI"
    case "SUBMITTED":
      return "TERKIRIM (MENUNGGU VERIFIKASI KEPALA RUANGAN)"
    case "REVISION_REQUIRED":
      return "PERLU PERBAIKAN / REVISI DARI PELAPOR"
    case "UNDER_REVIEW":
      return "SEDANG DITINJAU OLEH KEPALA RUANGAN IBS"
    case "SIMPLE_INVESTIGATION":
      return "DALAM INVESTIGASI SEDERHANA TINGKAT UNIT"
    case "PMKP_REVIEW":
      return "DALAM TINJAUAN MUTU KOMITE PMKP"
    case "COMPLETED_BY_UNIT":
      return "SELESAI DI TINGKAT UNIT (COMPLETED_BY_UNIT)"
    case "COMPLETED":
      return "SELESAI (KASUS DITUTUP RESMI)"
    default:
      return status
  }
}

function formatAuditLabel(type: string): string {
  switch (type) {
    case "DRAFT_CREATED":
      return "Draf Dibuat"
    case "REPORT_SUBMITTED":
      return "Laporan Resmi Dikirimkan"
    case "REVISION_REQUIRED":
      return "Permintaan Perbaikan / Revisi"
    case "SIMPLE_INVESTIGATION_COMPLETED":
      return "Investigasi Sederhana Diselesaikan"
    case "REPORT_COMPLETED":
      return "Laporan Selesai (Kasus Ditutup)"
    case "EMERGENCY_CORRECTION":
      return "Koreksi Darurat Dilakukan"
    default:
      return type
  }
}

export function IncidentPrintPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [report, setReport] = useState<IncidentReport | null>(null)
  const [investigation, setInvestigation] = useState<SimpleInvestigation | null>(null)
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [printedAt, setPrintedAt] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadPrintData = async () => {
    if (!id) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await fetchIncidentPrint(id)
      setReport(data.report)
      setInvestigation(data.investigation)
      setAuditRecords(data.auditRecords)
      setPrintedAt(data.printedAt)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memuat dokumen cetak.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function init() {
      if (!id) return
      try {
        const data = await fetchIncidentPrint(id)
        if (!isMounted) return
        setReport(data.report)
        setInvestigation(data.investigation)
        setAuditRecords(data.auditRecords)
        setPrintedAt(data.printedAt)
      } catch (err) {
        if (!isMounted) return
        setErrorMessage(err instanceof Error ? err.message : "Gagal memuat dokumen cetak.")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void init()

    return () => {
      isMounted = false
    }
  }, [id])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8 no-print">
        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Menyiapkan lembar cetak dokumen resmi...</span>
        </div>
      </div>
    )
  }

  if (errorMessage || !report) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 p-8 text-center no-print">
        <IconAlertCircle className="size-10 text-destructive" />
        <h2 className="text-lg font-semibold">Gagal Membuka Dokumen Cetak</h2>
        <p className="text-xs text-muted-foreground">
          {errorMessage ?? "Laporan insiden tidak ditemukan atau Anda tidak memiliki akses."}
        </p>
        <Button onClick={() => void navigate("/laporan")} size="sm" variant="outline">
          Kembali ke Daftar Laporan
        </Button>
      </div>
    )
  }

  const isDraft = report.status === "DRAFT"
  const recommendations = parseTableRows<RecommendationItem>(investigation?.recommendations)
  const actions = parseTableRows<ActionItem>(investigation?.actions)

  const printTimeFormatted = printedAt
    ? new Date(printedAt).toLocaleString("id-ID") + " WITA"
    : new Date().toLocaleString("id-ID") + " WITA"

  return (
    <div className="min-h-screen bg-slate-100 py-6 text-slate-900 print:bg-white print:p-0 print:text-black">
      {/* 1. Top Non-Printed Action Bar */}
      <div className="no-print mx-auto mb-6 flex max-w-4xl items-center justify-between gap-4 rounded-xl border bg-card px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            className="size-8 text-muted-foreground"
            onClick={() => void navigate(-1)}
            size="icon"
            variant="ghost"
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-sm font-bold text-foreground">
              Pratinjau Cetak Formulir IKP (A4 Portrait)
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Gunakan opsi cetak peramban atau "Save as PDF" untuk mencetak dokumen akreditasi
              resmi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            className="gap-1.5 text-xs"
            onClick={() => void loadPrintData()}
            size="sm"
            variant="outline"
          >
            <IconRefresh className="size-3.5" />
            <span>Segarkan Data</span>
          </Button>
          <Button
            className="gap-1.5 text-xs font-semibold"
            onClick={() => {
              window.print()
            }}
            size="sm"
          >
            <IconPrinter className="size-4" />
            <span>Cetak Dokumen (Print)</span>
          </Button>
        </div>
      </div>

      {/* 2. Formal A4 Document Paper Sheet */}
      <div className="mx-auto max-w-[210mm] bg-white p-8 shadow-md print:max-w-none print:p-0 print:shadow-none sm:rounded-lg sm:p-12">
        {/* Document Header (Kop Surat Resmi) */}
        <header className="border-b-2 border-slate-900 pb-3 text-center">
          <div className="flex items-center justify-between gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-white print:border print:border-black print:bg-white print:text-black">
              <IconHeartbeat className="size-9" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[11px] font-bold tracking-wider uppercase">
                Pemerintah Provinsi Nusa Tenggara Timur
              </p>
              <h2 className="text-sm font-extrabold tracking-tight uppercase sm:text-base">
                RSUD Prof. Dr. W. Z. Johannes Kupang
              </h2>
              <p className="text-xs font-bold tracking-tight text-teal-900 uppercase print:text-black">
                Instalasi Bedah Sentral (IBS) &bull; Komite Mutu &amp; Keselamatan Pasien (PMKP)
              </p>
              <p className="text-[9.5px] text-slate-600 print:text-black">
                Jl. Dr. Moch. Hatta No. 19, Kupang, NTT &bull; Telp: (0380) 833614
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-slate-300 p-1 text-center text-[9px] font-bold leading-3 uppercase print:border-black">
              Dokumen Rahasia
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-400 pt-2 text-[10px] text-slate-700 print:border-black print:text-black">
            <span>SISTEM INFORMASI PELAPORAN INSIDEN KESELAMATAN PASIEN (SIP-IKP)</span>
            <span className="font-mono font-bold">NOMOR: {report.report_number ?? "DRAF-IKP"}</span>
            <span>DICETAK: {printTimeFormatted}</span>
          </div>
        </header>

        {/* Title & Classification Bar */}
        <div className="mt-4 flex flex-col gap-1 text-center">
          <h1 className="text-base font-extrabold tracking-tight uppercase">
            Formulir Pelaporan Insiden Keselamatan Pasien (IKP)
          </h1>
          <p className="text-[10px] font-semibold tracking-wide text-rose-700 uppercase print:text-black">
            Rahasia &bull; Tidak Boleh Difotocopy &bull; Dilaporkan Maksimal 2 x 24 Jam
          </p>
        </div>

        {/* Status Alert if Draft */}
        {isDraft && (
          <div className="mt-3 border-2 border-dashed border-amber-600 bg-amber-50 p-2.5 text-center text-xs font-bold text-amber-900 print:border-black print:bg-white print:text-black">
            *** DRAF — BELUM MENJADI LAPORAN RESMI (TIDAK BERLAKU UNTUK AUDIT AKREDITASI) ***
          </div>
        )}

        {/* Status and Risk Banner */}
        <div className="mt-4 grid grid-cols-2 gap-2 border border-slate-800 bg-slate-50 p-2 text-xs print:border-black print:bg-white">
          <div>
            <span className="text-[10px] text-slate-600 print:text-black">Status Dokumen:</span>
            <p className="font-bold text-slate-900 print:text-black">
              {formatStatusText(report.status)}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-600 print:text-black">Grading Risiko:</span>
            <p className="font-bold text-slate-900 print:text-black">
              {report.risk_grade ? `PITA RISIKO ${report.risk_grade}` : "BELUM DITENTUKAN"}
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BAGIAN I: DATA PASIEN */}
        {/* ========================================================================= */}
        <section aria-labelledby="print-sec-patient" className="mt-5 print-break-inside-avoid">
          <h3
            className="border-b border-slate-800 bg-slate-200 px-2 py-1 text-xs font-bold tracking-tight uppercase print:border-black print:bg-slate-100"
            id="print-sec-patient"
          >
            I. Data Pasien
          </h3>

          <table className="mt-1 w-full border-collapse border border-slate-400 text-xs print:border-black">
            <tbody>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="w-1/3 border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  1. Nama Pasien
                </td>
                <td className="w-2/3 p-1.5 font-semibold">
                  {"patient_name" in report
                    ? report.patient_name || "-"
                    : "[Disensor Sesuai Kebijakan Privasi Administrator]"}
                </td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  2. No. Rekam Medis (No. MR)
                </td>
                <td className="p-1.5 font-mono font-semibold">
                  {"medical_record_number" in report
                    ? report.medical_record_number || "-"
                    : "[Disensor Sesuai Kebijakan Privasi Administrator]"}
                </td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  3. Ruangan / Bangsal Pasien
                </td>
                <td className="p-1.5">{report.patient_room || "-"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  4. Kelompok Umur
                </td>
                <td className="p-1.5">{report.patient_age_category || "-"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  5. Jenis Kelamin
                </td>
                <td className="p-1.5">
                  {report.patient_gender === "LAKI_LAKI"
                    ? "Laki-laki"
                    : report.patient_gender === "PEREMPUAN"
                      ? "Perempuan"
                      : "-"}
                </td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  6. Penanggung Biaya Pasien
                </td>
                <td className="p-1.5">{report.patient_payer_type || "-"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  7. Tanggal &amp; Jam Masuk RS
                </td>
                <td className="p-1.5">
                  {report.admission_datetime
                    ? new Date(report.admission_datetime).toLocaleString("id-ID") + " WITA"
                    : "-"}
                </td>
              </tr>
              <tr>
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  8. Jenis Pelayanan Pasien
                </td>
                <td className="p-1.5">{report.patient_care_type || "-"}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ========================================================================= */}
        {/* BAGIAN II: RINCIAN KEJADIAN INSIDEN */}
        {/* ========================================================================= */}
        <section aria-labelledby="print-sec-incident" className="mt-5 print-break-inside-avoid">
          <h3
            className="border-b border-slate-800 bg-slate-200 px-2 py-1 text-xs font-bold tracking-tight uppercase print:border-black print:bg-slate-100"
            id="print-sec-incident"
          >
            II. Rincian Kejadian Insiden
          </h3>

          <table className="mt-1 w-full border-collapse border border-slate-400 text-xs print:border-black">
            <tbody>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="w-1/3 border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  1. Tanggal &amp; Waktu Insiden
                </td>
                <td className="w-2/3 p-1.5 font-semibold">
                  {new Date(report.incident_datetime).toLocaleString("id-ID")} WITA
                </td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  2. Jenis Insiden
                </td>
                <td className="p-1.5 font-semibold">
                  {report.incident_type} &mdash;{" "}
                  {report.incident_type === "KNC"
                    ? "Kejadian Nyaris Cedera (Near Miss)"
                    : report.incident_type === "KTC"
                      ? "Kejadian Tidak Cedera (No Harm)"
                      : report.incident_type === "KTD"
                        ? "Kejadian Tidak Diharapkan (Adverse Event)"
                        : "Kejadian Sentinel (Sentinel Event)"}
                </td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  3. Judul / Ringkasan Insiden
                </td>
                <td className="p-1.5 font-semibold">{report.incident_title || "-"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  4. Insiden Terjadi Pada (Sasaran)
                </td>
                <td className="p-1.5">
                  {report.incident_target}{" "}
                  {report.incident_target_other ? `(${report.incident_target_other})` : ""}
                </td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  5. Orang Pertama Melaporkan
                </td>
                <td className="p-1.5">
                  {report.initial_reporter_category || "-"}{" "}
                  {report.initial_reporter_detail ? `(${report.initial_reporter_detail})` : ""}
                </td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  6. Tempat / Kamar Operasi Kejadian
                </td>
                <td className="p-1.5">{report.incident_location || "-"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  7. Spesialisasi Kasus Terkait
                </td>
                <td className="p-1.5">{report.clinical_specialization || "-"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  8. Unit Penyebab Insiden
                </td>
                <td className="p-1.5">{report.causing_unit || "-"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  9. Akibat / Derajat Cedera Pasien
                </td>
                <td className="p-1.5 font-medium">{report.patient_impact || "-"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white align-top">
                  10. Kronologi Lengkap Insiden (5W+1H)
                </td>
                <td className="p-1.5 leading-relaxed break-words whitespace-pre-wrap">
                  {"chronology" in report
                    ? report.chronology || "-"
                    : "[Disensor Sesuai Kebijakan Privasi Administrator]"}
                </td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white align-top">
                  11. Tindakan Segera &amp; Hasilnya
                </td>
                <td className="p-1.5 leading-relaxed break-words whitespace-pre-wrap">
                  {report.immediate_action_and_result || "-"}
                </td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  12. Tindakan Dilakukan Oleh
                </td>
                <td className="p-1.5">{report.action_taken_by || "-"}</td>
              </tr>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  13. Kejadian Serupa Pernah Terjadi?
                </td>
                <td className="p-1.5">
                  {report.similar_incident_occurred || "-"}{" "}
                  {report.similar_incident_details
                    ? `(Detail: ${report.similar_incident_details})`
                    : ""}
                </td>
              </tr>
              <tr>
                <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                  14. Kepatuhan Waktu Pelaporan (SLA 48 Jam)
                </td>
                <td className="p-1.5 font-medium">
                  {report.is_overdue_sla === 1 ? (
                    <span className="font-bold text-rose-700 print:text-black">
                      TERLAMBAT (&gt; 48 Jam) &mdash; Alasan: {report.overdue_reason || "-"}
                    </span>
                  ) : (
                    <span className="font-bold text-teal-800 print:text-black">
                      TEPAT WAKTU (&le; 48 Jam)
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Catatan Mitigasi Risiko Tinggi jika ada */}
        {report.high_risk_mitigation_notes && (
          <div className="mt-4 border border-slate-800 bg-amber-50/50 p-2.5 text-xs print:border-black print:bg-white print-break-inside-avoid">
            <span className="font-bold text-slate-900 print:text-black">
              Catatan Awal Mitigasi &amp; Tindakan Pencegahan Segera (Kepala Ruangan IBS):
            </span>
            <p className="mt-1 leading-relaxed break-words whitespace-pre-wrap text-slate-800 print:text-black">
              {report.high_risk_mitigation_notes}
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BAGIAN III: LEMBAR KERJA INVESTIGASI SEDERHANA (JIKA ADA) */}
        {/* ========================================================================= */}
        {investigation &&
          (report.status === "SIMPLE_INVESTIGATION" || report.status === "COMPLETED_BY_UNIT") && (
            <section
              aria-labelledby="print-sec-investigation"
              className="mt-5 print-break-inside-avoid"
            >
              <h3
                className="border-b border-slate-800 bg-slate-200 px-2 py-1 text-xs font-bold tracking-tight uppercase print:border-black print:bg-slate-100"
                id="print-sec-investigation"
              >
                III. Lembar Kerja Investigasi Sederhana
              </h3>

              <table className="mt-1 w-full border-collapse border border-slate-400 text-xs print:border-black">
                <tbody>
                  <tr className="border-b border-slate-300 print:border-black">
                    <td className="w-1/3 border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white align-top">
                      1. Penyebab Langsung Insiden (Direct Cause)
                    </td>
                    <td className="w-2/3 p-1.5 break-words whitespace-pre-wrap">
                      {investigation.direct_cause || "-"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-300 print:border-black">
                    <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white align-top">
                      2. Akar Masalah (Root Cause)
                    </td>
                    <td className="p-1.5 break-words whitespace-pre-wrap">
                      {investigation.underlying_root_cause || "-"}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-r border-slate-300 bg-slate-50 p-1.5 font-medium print:border-black print:bg-white">
                      3. Rentang Waktu Investigasi
                    </td>
                    <td className="p-1.5 font-medium">
                      Mulai: {investigation.investigation_start_date || "-"} &bull; Selesai:{" "}
                      {investigation.investigation_end_date || "-"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Tabel Rekomendasi */}
              <div className="mt-3">
                <h4 className="text-[11px] font-bold uppercase text-slate-800 print:text-black">
                  Tabel Rekomendasi Pencegahan:
                </h4>
                <table className="mt-1 w-full border-collapse border border-slate-400 text-[10.5px] print:border-black">
                  <thead className="bg-slate-100 print:bg-white">
                    <tr className="border-b border-slate-400 print:border-black text-center font-bold">
                      <th className="w-10 border-r border-slate-400 p-1 print:border-black">No</th>
                      <th className="border-r border-slate-400 p-1 print:border-black text-left">
                        Rekomendasi
                      </th>
                      <th className="w-40 border-r border-slate-400 p-1 print:border-black">
                        Penanggung Jawab
                      </th>
                      <th className="w-28 p-1">Target Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.length > 0 ? (
                      recommendations.map((rec, idx) => (
                        <tr className="border-b border-slate-300 print:border-black" key={idx}>
                          <td className="border-r border-slate-300 p-1 text-center print:border-black">
                            {idx + 1}
                          </td>
                          <td className="border-r border-slate-300 p-1 print:border-black break-words">
                            {rec.text}
                          </td>
                          <td className="border-r border-slate-300 p-1 text-center print:border-black">
                            {rec.responsible}
                          </td>
                          <td className="p-1 text-center">{rec.target_date}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2 text-center text-slate-500" colSpan={4}>
                          Tidak ada data rekomendasi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tabel Tindakan Perbaikan */}
              <div className="mt-3">
                <h4 className="text-[11px] font-bold uppercase text-slate-800 print:text-black">
                  Tabel Tindakan Perbaikan (Action Plan):
                </h4>
                <table className="mt-1 w-full border-collapse border border-slate-400 text-[10.5px] print:border-black">
                  <thead className="bg-slate-100 print:bg-white">
                    <tr className="border-b border-slate-400 print:border-black text-center font-bold">
                      <th className="w-10 border-r border-slate-400 p-1 print:border-black">No</th>
                      <th className="border-r border-slate-400 p-1 print:border-black text-left">
                        Tindakan Perbaikan
                      </th>
                      <th className="w-40 border-r border-slate-400 p-1 print:border-black">
                        Penanggung Jawab
                      </th>
                      <th className="w-28 p-1">Target Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.length > 0 ? (
                      actions.map((act, idx) => (
                        <tr className="border-b border-slate-300 print:border-black" key={idx}>
                          <td className="border-r border-slate-300 p-1 text-center print:border-black">
                            {idx + 1}
                          </td>
                          <td className="border-r border-slate-300 p-1 print:border-black break-words">
                            {act.text}
                          </td>
                          <td className="border-r border-slate-300 p-1 text-center print:border-black">
                            {act.responsible}
                          </td>
                          <td className="p-1 text-center">{act.target_date}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2 text-center text-slate-500" colSpan={4}>
                          Tidak ada data tindakan
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        {/* Tinjauan Mutu Komite PMKP jika ada */}
        {report.pmkp_review_notes && (
          <div className="mt-4 border border-slate-800 bg-purple-50/50 p-2.5 text-xs print:border-black print:bg-white print-break-inside-avoid">
            <span className="font-bold text-slate-900 print:text-black">
              Catatan Arahan &amp; Evaluasi Komite PMKP:
            </span>
            <p className="mt-1 leading-relaxed break-words whitespace-pre-wrap text-slate-800 print:text-black">
              {report.pmkp_review_notes}
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* KOTAK ATRIBUSI RESMI DOKUMEN (DIGITAL ATTRIBUTION) */}
        {/* ========================================================================= */}
        <section aria-labelledby="print-sec-attribution" className="mt-6 print-break-inside-avoid">
          <h3 className="sr-only" id="print-sec-attribution">
            Atribusi Dokumen
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
            {/* Box 1: Pelapor */}
            <div className="flex flex-col justify-between rounded border border-slate-400 p-2.5 print:border-black">
              <span className="text-[10px] font-bold text-slate-600 print:text-black">
                Dibuat oleh (Pelapor):
              </span>
              <div className="my-3 text-center">
                <span className="inline-block rounded bg-slate-100 px-2 py-1 text-[9px] font-mono text-slate-700 print:bg-white print:text-black">
                  [TERVERIFIKASI SISTEM]
                </span>
              </div>
              <div className="border-t border-slate-300 pt-1 text-center text-[10px] leading-tight print:border-black">
                <p className="font-bold">{report.reporter_name}</p>
                <p className="text-slate-600 print:text-black">{report.reporter_role}</p>
                <p className="mt-0.5 text-[9px] text-slate-500 print:text-black">
                  {report.submitted_at
                    ? new Date(report.submitted_at).toLocaleDateString("id-ID")
                    : "Draf"}
                </p>
              </div>
            </div>

            {/* Box 2: Penerima (Kepala Ruangan) */}
            <div className="flex flex-col justify-between rounded border border-slate-400 p-2.5 print:border-black">
              <span className="text-[10px] font-bold text-slate-600 print:text-black">
                Diterima / Diverifikasi oleh:
              </span>
              <div className="my-3 text-center">
                <span className="inline-block rounded bg-slate-100 px-2 py-1 text-[9px] font-mono text-slate-700 print:bg-white print:text-black">
                  [TERVERIFIKASI SISTEM]
                </span>
              </div>
              <div className="border-t border-slate-300 pt-1 text-center text-[10px] leading-tight print:border-black">
                <p className="font-bold">Kepala Ruangan IBS</p>
                <p className="text-slate-600 print:text-black">Instalasi Bedah Sentral</p>
                <p className="mt-0.5 text-[9px] text-slate-500 print:text-black">
                  {report.received_at
                    ? new Date(report.received_at).toLocaleDateString("id-ID")
                    : "-"}
                </p>
              </div>
            </div>

            {/* Box 3: Komite PMKP / Status Akhir */}
            <div className="col-span-2 flex flex-col justify-between rounded border border-slate-400 p-2.5 sm:col-span-1 print:border-black">
              <span className="text-[10px] font-bold text-slate-600 print:text-black">
                Disahkan / Ditutup oleh:
              </span>
              <div className="my-3 text-center">
                <span className="inline-block rounded bg-slate-100 px-2 py-1 text-[9px] font-mono text-slate-700 print:bg-white print:text-black">
                  [ATRIBUSI SISTEM]
                </span>
              </div>
              <div className="border-t border-slate-300 pt-1 text-center text-[10px] leading-tight print:border-black">
                <p className="font-bold">
                  {report.status === "COMPLETED_BY_UNIT"
                    ? "Kepala Ruangan IBS"
                    : report.status === "COMPLETED"
                      ? "Komite PMKP RS"
                      : "-"}
                </p>
                <p className="text-slate-600 print:text-black">
                  {report.completed_at
                    ? `Selesai: ${new Date(report.completed_at).toLocaleDateString("id-ID")}`
                    : "Dalam Proses"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RINGKASAN AUDIT TRAIL DALAM DOKUMEN CETAK */}
        {/* ========================================================================= */}
        {auditRecords.length > 0 && (
          <section aria-labelledby="print-sec-audit" className="mt-6 print-break-inside-avoid">
            <div className="flex items-center gap-1.5 border-b border-slate-400 pb-1 print:border-black">
              <IconShieldLock className="size-3.5 text-slate-700 print:text-black" />
              <h4
                className="text-[10px] font-bold uppercase tracking-wider text-slate-800 print:text-black"
                id="print-sec-audit"
              >
                Catatan Jejak Audit Dokumen (System Audit Trail)
              </h4>
            </div>

            <table className="mt-1 w-full border-collapse border border-slate-300 text-[9.5px] print:border-black">
              <thead>
                <tr className="bg-slate-100 text-left font-bold text-slate-700 print:bg-white print:text-black">
                  <th className="w-32 border-r border-slate-300 p-1 print:border-black">
                    Waktu (WITA)
                  </th>
                  <th className="w-40 border-r border-slate-300 p-1 print:border-black">
                    Jenis Tindakan
                  </th>
                  <th className="w-44 border-r border-slate-300 p-1 print:border-black">Pelaku</th>
                  <th className="p-1">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {auditRecords.map((rec) => (
                  <tr className="border-b border-slate-200 print:border-black" key={rec.id}>
                    <td className="border-r border-slate-200 p-1 font-mono print:border-black">
                      {new Date(rec.occurredAt).toLocaleString("id-ID")}
                    </td>
                    <td className="border-r border-slate-200 p-1 font-semibold print:border-black">
                      {formatAuditLabel(rec.eventType)}
                    </td>
                    <td className="border-r border-slate-200 p-1 print:border-black">
                      {rec.actorName} ({rec.actorRole})
                    </td>
                    <td className="p-1 break-words">{rec.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  )
}
