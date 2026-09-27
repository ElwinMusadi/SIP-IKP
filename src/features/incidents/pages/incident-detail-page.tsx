import { useEffect, useState } from "react"
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCalendar,
  IconCheck,
  IconPrinter,
  IconRefresh,
  IconUser,
} from "@tabler/icons-react"
import { useLocation, useNavigate, useParams } from "react-router"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/use-auth"
import {
  assignRiskGrade,
  completeInvestigation,
  emergencyCorrection,
  fetchIncidentAudit,
  fetchIncidentById,
  finalizePmkpReview,
  receiveIncident,
  requestRevision,
  saveInvestigation,
  savePmkpReview,
} from "../api/incidents-api"
import { AuditTimelineView } from "../components/audit-timeline-view"
import { EmergencyCorrectionDialog } from "../components/emergency-correction-dialog"
import { HeadRoomReviewPanel } from "../components/head-room-review-panel"
import { IncidentStatusBadge } from "../components/incident-status-badge"
import { InvestigationWorksheet } from "../components/investigation-worksheet"
import { PmkpReviewPanel } from "../components/pmkp-review-panel"
import { RiskBadge } from "../components/risk-badge"
import type { AuditRecord, IncidentReport } from "../types/incident"

interface LocationState {
  submitSuccess?: boolean
}

export function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, csrfToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [report, setReport] = useState<IncidentReport | null>(null)
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false)

  const state = location.state as LocationState | null
  const [showSuccessBanner, setShowSuccessBanner] = useState(Boolean(state?.submitSuccess))

  const loadReport = async () => {
    if (!id) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [reportData, auditData] = await Promise.all([
        fetchIncidentById(id),
        fetchIncidentAudit(id).catch(() => []),
      ])
      setReport(reportData)
      setAuditRecords(auditData)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memuat detail laporan.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    async function init() {
      if (!id) return
      try {
        const [reportData, auditData] = await Promise.all([
          fetchIncidentById(id),
          fetchIncidentAudit(id).catch(() => []),
        ])
        if (!isMounted) return
        setReport(reportData)
        setAuditRecords(auditData)
      } catch (err) {
        if (!isMounted) return
        setErrorMessage(err instanceof Error ? err.message : "Gagal memuat detail laporan.")
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
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Memuat detail insiden...</span>
        </div>
      </div>
    )
  }

  if (errorMessage || !report) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 p-8 text-center">
        <IconAlertCircle className="size-10 text-destructive" />
        <h2 className="text-lg font-semibold">Laporan Tidak Ditemukan atau Akses Ditolak</h2>
        <p className="text-xs text-muted-foreground">
          {errorMessage ?? "Laporan insiden dengan ID yang ditentukan tidak ditemukan."}
        </p>
        <Button
          onClick={() => {
            void navigate("/laporan")
          }}
          size="sm"
          variant="outline"
        >
          Kembali ke Daftar Laporan
        </Button>
      </div>
    )
  }

  // Permissions
  const isHeadOfRoom = user?.role === "KEPALA_RUANGAN"
  const isPmkp = user?.role === "KOMITE_PMKP"

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            className="size-8 text-muted-foreground"
            onClick={() => {
              void navigate("/laporan")
            }}
            size="icon"
            variant="ghost"
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-foreground">
                {report.report_number ?? "DRAF-IKP"}
              </span>
              <IncidentStatusBadge status={report.status} />
              <RiskBadge grade={report.risk_grade} />
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {report.incident_title || "(Draf Tanpa Judul)"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="gap-1.5"
            onClick={() => {
              void navigate(`/laporan/${report.id}/cetak`)
            }}
            size="sm"
            variant="default"
          >
            <IconPrinter className="size-3.5" />
            <span>Cetak Laporan</span>
          </Button>
          <Button
            className="gap-1.5"
            onClick={() => {
              void loadReport()
            }}
            size="sm"
            variant="outline"
          >
            <IconRefresh className="size-3.5" />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Success banner after submit */}
      {showSuccessBanner && (
        <div
          aria-live="polite"
          className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          <div className="flex items-center gap-2">
            <IconCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              Laporan insiden resmi berhasil dikirimkan dengan nomor referensi{" "}
              <strong>{report.report_number}</strong>. Data telah dikunci dan masuk ke antrean
              verifikasi Kepala Ruangan IBS.
            </span>
          </div>
          <button
            className="text-xs font-semibold underline"
            onClick={() => {
              setShowSuccessBanner(false)
            }}
            type="button"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Revision Required banner */}
      {report.status === "REVISION_REQUIRED" && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-50/50 p-4 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <IconAlertCircle className="size-4 shrink-0 text-amber-600" />
            <span>Laporan Memerlukan Perbaikan / Revisi dari Pelapor</span>
          </div>
          {report.revision_reason && (
            <p className="rounded-md border border-amber-200 bg-background/80 p-2.5 dark:border-amber-900/50">
              <strong>Arahan Kepala Ruangan:</strong> {report.revision_reason}
            </p>
          )}
          {report.created_by_user_id === user?.id && (
            <div>
              <Button
                className="mt-1 text-xs"
                onClick={() => {
                  void navigate(`/laporan/baru`)
                }}
                size="sm"
              >
                Buka &amp; Perbaiki Laporan
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Terminal Completed banner */}
      {(report.status === "COMPLETED_BY_UNIT" || report.status === "COMPLETED") && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/60 p-4 text-xs font-medium text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <IconCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <span>
              Kasus insiden ini telah berstatus <strong>{report.status}</strong> dan ditutup secara
              resmi pada{" "}
              {report.completed_at ? new Date(report.completed_at).toLocaleString("id-ID") : ""}.
              Berkas terkunci permanen.
            </span>
          </div>
        </div>
      )}

      {/* Reviewer Action Panel for Kepala Ruangan */}
      {isHeadOfRoom && (report.status === "SUBMITTED" || report.status === "UNDER_REVIEW") && (
        <HeadRoomReviewPanel
          onAssignRiskGrade={async (grade, notes) => {
            await assignRiskGrade(report.id, grade, notes, csrfToken ?? undefined)
            await loadReport()
          }}
          onOpenEmergencyCorrection={() => {
            setIsCorrectionOpen(true)
          }}
          onReceive={async () => {
            await receiveIncident(report.id, csrfToken ?? undefined)
            await loadReport()
          }}
          onRequestRevision={async (reason) => {
            await requestRevision(report.id, reason, csrfToken ?? undefined)
            await loadReport()
          }}
          report={report}
        />
      )}

      {/* Emergency Correction Dialog */}
      <EmergencyCorrectionDialog
        isOpen={isCorrectionOpen}
        onClose={() => {
          setIsCorrectionOpen(false)
        }}
        onSubmitCorrection={async (reason, fields) => {
          await emergencyCorrection(report.id, reason, fields, csrfToken ?? undefined)
          await loadReport()
        }}
        report={report}
      />

      {/* Simple Investigation Worksheet (BIRU / HIJAU) */}
      {(report.status === "SIMPLE_INVESTIGATION" || report.status === "COMPLETED_BY_UNIT") && (
        <InvestigationWorksheet
          canEdit={isHeadOfRoom && report.status === "SIMPLE_INVESTIGATION"}
          investigation={report.investigation}
          onComplete={async () => {
            await completeInvestigation(report.id, csrfToken ?? undefined)
            await loadReport()
          }}
          onSave={async (invData) => {
            await saveInvestigation(report.id, invData, csrfToken ?? undefined)
            await loadReport()
          }}
        />
      )}

      {/* PMKP Review Panel (KUNING / MERAH) */}
      {(report.status === "PMKP_REVIEW" ||
        (report.status === "COMPLETED" &&
          (report.risk_grade === "KUNING" || report.risk_grade === "MERAH"))) && (
        <PmkpReviewPanel
          canEditNotes={isPmkp && report.status === "PMKP_REVIEW"}
          canFinalize={(isPmkp || isHeadOfRoom) && report.status === "PMKP_REVIEW"}
          onFinalize={async () => {
            await finalizePmkpReview(report.id, csrfToken ?? undefined)
            await loadReport()
          }}
          onSaveNotes={async (notes) => {
            await savePmkpReview(report.id, notes, csrfToken ?? undefined)
            await loadReport()
          }}
          report={report}
        />
      )}

      {/* Incident Summary Cards: Bagian I and Bagian II */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Bagian I Card */}
        <article className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b pb-3">
            <IconUser className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Bagian I: Data Pasien</h3>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Nama Pasien</dt>
              <dd className="font-semibold text-foreground">{report.patient_name || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nomor Rekam Medis</dt>
              <dd className="font-mono font-semibold text-foreground">
                {report.medical_record_number || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ruangan / Bangsal</dt>
              <dd className="text-foreground">{report.patient_room || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Kelompok Umur</dt>
              <dd className="text-foreground">{report.patient_age_category || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Jenis Kelamin</dt>
              <dd className="text-foreground">
                {report.patient_gender === "LAKI_LAKI"
                  ? "Laki-laki"
                  : report.patient_gender === "PEREMPUAN"
                    ? "Perempuan"
                    : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Penanggung Biaya</dt>
              <dd className="text-foreground">{report.patient_payer_type || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Jenis Pelayanan</dt>
              <dd className="text-foreground">{report.patient_care_type || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tanggal &amp; Jam Masuk RS</dt>
              <dd className="text-foreground">
                {report.admission_datetime
                  ? new Date(report.admission_datetime).toLocaleString("id-ID")
                  : "-"}
              </dd>
            </div>
          </dl>
        </article>

        {/* Bagian II Meta Card */}
        <article className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2 border-b pb-3">
            <IconCalendar className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Bagian II: Metadata Kejadian</h3>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Tanggal &amp; Waktu Insiden</dt>
              <dd className="font-semibold text-foreground">
                {new Date(report.incident_datetime).toLocaleString("id-ID")} WITA
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Jenis Insiden</dt>
              <dd className="font-semibold text-foreground">{report.incident_type}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sasaran Insiden</dt>
              <dd className="text-foreground">
                {report.incident_target}{" "}
                {report.incident_target_other ? `(${report.incident_target_other})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pelapor Pertama</dt>
              <dd className="text-foreground">
                {report.initial_reporter_category || "-"}
                {report.initial_reporter_detail ? ` (${report.initial_reporter_detail})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tempat / Kamar Operasi</dt>
              <dd className="text-foreground">{report.incident_location || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Spesialisasi Klinis</dt>
              <dd className="text-foreground">{report.clinical_specialization || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Unit Penyebab Insiden</dt>
              <dd className="text-foreground">{report.causing_unit || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Derajat Cedera Pasien</dt>
              <dd className="text-foreground">{report.patient_impact || "-"}</dd>
            </div>
          </dl>
        </article>

        {/* Kronologi Card */}
        <article className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs sm:col-span-2">
          <h3 className="text-sm font-semibold text-foreground">
            Kronologi Lengkap Insiden (5W+1H)
          </h3>
          <p className="rounded-lg border bg-muted/20 p-4 text-xs leading-6 text-foreground whitespace-pre-wrap">
            {report.chronology || "(Kronologi belum diisi)"}
          </p>

          <div className="mt-2 grid gap-3 sm:grid-cols-2 text-xs">
            <div>
              <span className="font-semibold text-muted-foreground">
                Tindakan Segera &amp; Hasilnya:
              </span>
              <p className="mt-1 text-foreground whitespace-pre-wrap">
                {report.immediate_action_and_result || "-"}
              </p>
            </div>
            <div>
              <span className="font-semibold text-muted-foreground">Tindakan Dilakukan Oleh:</span>
              <p className="mt-1 text-foreground">{report.action_taken_by || "-"}</p>
            </div>
          </div>
        </article>
      </div>

      {/* Audit Timeline Section */}
      <AuditTimelineView records={auditRecords} />
    </div>
  )
}
