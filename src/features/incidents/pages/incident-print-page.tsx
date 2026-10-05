import { useEffect, useRef, useState } from "react"
import {
  IconArrowLeft,
  IconDownload,
  IconHeartbeat,
  IconLoader2,
  IconPrinter,
  IconRefresh,
  IconShieldLock,
} from "@tabler/icons-react"
import { useNavigate, useParams } from "react-router"

import { ErrorState } from "@/components/shared/error-state"
import { InlineLoader } from "@/components/shared/loading-states"
import { Button } from "@/components/ui/button"
import { fetchIncidentPrint } from "../api/incidents-api"
import { InitialReportersList } from "../components/initial-reporters-list"
import type {
  ActionItem,
  AuditRecord,
  IncidentReport,
  RecommendationItem,
  SimpleInvestigation,
} from "../types/incident"
import { buildIncidentPdfFilename } from "../utils/pdf-filename"
import {
  formatPrintAuditLabel,
  formatPrintStatus,
  parsePrintTableRows,
} from "../utils/print-formatters"

export function IncidentPrintPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const pdfGenerationLockRef = useRef(false)

  const [report, setReport] = useState<IncidentReport | null>(null)
  const [investigation, setInvestigation] = useState<SimpleInvestigation | null>(null)
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [printedAt, setPrintedAt] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

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

  const downloadPdf = async () => {
    if (!report || pdfGenerationLockRef.current) return

    pdfGenerationLockRef.current = true
    setIsGeneratingPdf(true)
    setPdfErrorMessage(null)

    try {
      const [{ pdf }, { IncidentPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../components/incident-pdf-document"),
      ])
      const blob = await pdf(
        <IncidentPdfDocument
          auditRecords={auditRecords}
          investigation={investigation}
          printedAt={printedAt}
          report={report}
        />,
      ).toBlob()
      const objectUrl = URL.createObjectURL(blob)
      const downloadLink = document.createElement("a")
      downloadLink.href = objectUrl
      downloadLink.download = buildIncidentPdfFilename(report.report_number, id)
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 1_000)
    } catch (error) {
      const pdfError =
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { name: "UnknownError", message: "Unknown PDF generation error" }
      console.error("Incident PDF generation failed", pdfError)
      setPdfErrorMessage(
        "PDF gagal dibuat di perangkat ini. Segarkan lalu coba unduh kembali, atau gunakan Cetak Dokumen.",
      )
    } finally {
      pdfGenerationLockRef.current = false
      setIsGeneratingPdf(false)
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
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center p-8 no-print">
        <InlineLoader label="Menyiapkan lembar cetak dokumen resmi…" />
      </div>
    )
  }

  if (errorMessage || !report) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 p-8 no-print">
        <ErrorState
          message={
            errorMessage ?? "Laporan insiden tidak ditemukan atau Anda tidak memiliki akses."
          }
          onRetry={() => void loadPrintData()}
          retryLabel="Coba Lagi"
          title="Gagal membuka dokumen cetak"
        />
        <Button onClick={() => void navigate("/laporan")} size="sm" variant="outline">
          Kembali ke Daftar Laporan
        </Button>
      </div>
    )
  }

  const isDraft = report.status === "DRAFT"
  const recommendations = parsePrintTableRows<RecommendationItem>(
    investigation?.recommendations,
    "recommendations",
  )
  const actions = parsePrintTableRows<ActionItem>(investigation?.actions, "actions")

  const printTimeFormatted = printedAt
    ? new Date(printedAt).toLocaleString("id-ID") + " WITA"
    : new Date().toLocaleString("id-ID") + " WITA"

  return (
    <div className="min-h-screen bg-muted/60 py-6 text-slate-900 print:bg-white print:p-0 print:text-black">
      {/* 1. Top Non-Printed Action Bar */}
      <div className="no-print mx-auto mb-6 grid max-w-4xl gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-sm sm:px-6 sm:py-4 lg:grid-cols-[minmax(18rem,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            aria-label="Kembali"
            className="shrink-0 text-muted-foreground"
            onClick={() => void navigate(-1)}
            size="icon"
            variant="ghost"
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-foreground">
              Pratinjau Cetak Formulir IKP (A4)
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Unduh PDF langsung atau gunakan cetak peramban untuk dokumen resmi.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 pl-10 sm:pl-0 lg:justify-end">
          <Button onClick={() => void loadPrintData()} size="sm" variant="outline">
            <IconRefresh data-icon="inline-start" />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
          <Button
            disabled={isGeneratingPdf}
            onClick={() => void downloadPdf()}
            size="sm"
            variant="outline"
          >
            {isGeneratingPdf ? (
              <IconLoader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <IconDownload data-icon="inline-start" />
            )}
            {isGeneratingPdf ? "Membuat PDF…" : "Download PDF"}
          </Button>
          <Button
            className="font-medium"
            onClick={() => {
              window.print()
            }}
            size="sm"
          >
            <IconPrinter data-icon="inline-start" />
            Cetak Dokumen
          </Button>
          {pdfErrorMessage && (
            <p className="w-full text-xs font-medium text-destructive" role="alert">
              {pdfErrorMessage}
            </p>
          )}
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
              {formatPrintStatus(report.status)}
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
                  <InitialReportersList report={report} />
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
              <tr>
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
                Ditutup oleh (Atribusi Penutupan):
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
                      {formatPrintAuditLabel(rec.eventType)}
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
