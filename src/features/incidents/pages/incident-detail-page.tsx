import { useEffect, useState } from "react"
import {
  IconAlertCircle,
  IconCheck,
  IconPrinter,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react"
import { useLocation, useNavigate, useParams } from "react-router"

import { DefinitionGrid } from "@/components/shared/definition-grid"
import { ErrorState } from "@/components/shared/error-state"
import { InlineLoader } from "@/components/shared/loading-states"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/use-auth"
import {
  assignRiskGrade,
  completeInvestigation,
  deleteIncident,
  emergencyCorrection,
  fetchIncidentAudit,
  fetchIncidentById,
  finalizePmkpReview,
  receiveIncident,
  requestRevision,
  saveInvestigation,
  savePmkpReview,
  skipInvestigation,
  startInvestigation,
} from "../api/incidents-api"
import { AuditTimelineView } from "../components/audit-timeline-view"
import { EmergencyCorrectionDialog } from "../components/emergency-correction-dialog"
import { HeadRoomReviewPanel } from "../components/head-room-review-panel"
import { InitialReportersList } from "../components/initial-reporters-list"
import { IncidentStatusBadge } from "../components/incident-status-badge"
import { InvestigationWorksheet } from "../components/investigation-worksheet"
import { PmkpReviewPanel } from "../components/pmkp-review-panel"
import { RiskBadge } from "../components/risk-badge"
import {
  INCIDENT_STATUS_META,
  INCIDENT_TARGET_LABELS,
  INCIDENT_TYPE_LABELS,
  type StatusMeta,
} from "../lib/labels"
import type { AuditRecord, IncidentReport } from "../types/incident"
import { showsInvestigationWorksheet } from "../lib/workflow-view"

interface LocationState {
  submitSuccess?: boolean
}

function formatTanggalWaktu(value: string | null): string {
  if (!value) return "-"
  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <InlineLoader label="Memuat detail laporan…" />
      </div>
    )
  }

  if (errorMessage || !report) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 sm:px-6 lg:px-8">
        <ErrorState
          message={errorMessage ?? "Laporan insiden dengan ID yang ditentukan tidak ditemukan."}
          onRetry={() => {
            void loadReport()
          }}
          title="Laporan tidak ditemukan atau akses ditolak"
        />
        <div className="flex justify-center">
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
      </div>
    )
  }

  // Permissions
  const isHeadOfRoom = user?.role === "KEPALA_RUANGAN"
  const isPmkp = user?.role === "KOMITE_PMKP"
  const isAdministrator = user?.role === "ADMINISTRATOR"
  const statusMeta = INCIDENT_STATUS_META[report.status] as StatusMeta | undefined

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        actions={
          <>
            {isAdministrator && (
              <Button className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { setShowDeleteConfirm(true) }} size="sm" variant="outline">
                <IconTrash data-icon="inline-start" /> Hapus
              </Button>
            )}
            <Button onClick={() => void loadReport()} size="sm" variant="outline">
              <IconRefresh data-icon="inline-start" />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
            <Button
              onClick={() => {
                void navigate(`/laporan/${report.id}/cetak`)
              }}
              size="sm"
            >
              <IconPrinter data-icon="inline-start" />
              Cetak
            </Button>
          </>
        }
        breadcrumbs={[
          { label: "Beranda", to: "/" },
          { label: "Laporan Insiden", to: "/laporan" },
          { label: report.report_number ?? "Draf" },
        ]}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs font-semibold text-foreground">
              {report.report_number ?? "DRAF"}
            </span>
            <IncidentStatusBadge full status={report.status} />
            <RiskBadge grade={report.risk_grade} />
          </span>
        }
        title={report.incident_title || "(Draf Tanpa Judul)"}
      />

      {/* Success banner after submit */}
      {showSuccessBanner && (
        <Alert className="border-status-success-foreground/25 bg-status-success">
          <IconCheck className="text-status-success-foreground" />
          <AlertTitle className="text-status-success-foreground">Laporan berhasil dikirim</AlertTitle>
          <AlertDescription className="text-status-success-foreground/90">
            Laporan resmi tercatat dengan nomor{" "}
            <strong className="font-semibold">{report.report_number}</strong>. Data telah dikunci
            dan masuk ke antrean verifikasi Kepala Ruangan IBS.
          </AlertDescription>
          <button
            className="absolute top-2.5 right-2.5 text-xs font-semibold text-status-success-foreground underline underline-offset-2"
            onClick={() => {
              setShowSuccessBanner(false)
            }}
            type="button"
          >
            Tutup
          </button>
        </Alert>
      )}

      {/* Revision Required banner */}
      {report.status === "REVISION_REQUIRED" && (
        <Alert className="border-status-warning-foreground/25 bg-status-warning">
          <IconAlertCircle className="text-status-warning-foreground" />
          <AlertTitle className="text-status-warning-foreground">
            Laporan memerlukan perbaikan
          </AlertTitle>
          <AlertDescription className="text-status-warning-foreground/90">
            Laporan dikembalikan oleh Kepala Ruangan dan menunggu revisi dari pelapor.
            {report.revision_reason && (
              <span className="mt-2 block rounded-md border border-status-warning-foreground/20 bg-background/70 p-2.5 text-foreground">
                <strong className="font-semibold">Arahan Kepala Ruangan:</strong>{" "}
                {report.revision_reason}
              </span>
            )}
            {report.created_by_user_id === user?.id && (
              <Button
                className="mt-2.5"
                onClick={() => {
                  void navigate(`/laporan/${report.id}/edit`)
                }}
                size="sm"
              >
                Perbaiki Laporan
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Terminal Completed banner */}
      {(report.status === "COMPLETED_BY_UNIT" || report.status === "COMPLETED") && (
        <Alert className="border-status-success-foreground/25 bg-status-success">
          <IconCheck className="text-status-success-foreground" />
          <AlertTitle className="text-status-success-foreground">Kasus ditutup</AlertTitle>
          <AlertDescription className="text-status-success-foreground/90">
            Laporan berstatus {statusMeta?.full ?? report.status}
            {report.completed_at ? ` sejak ${formatTanggalWaktu(report.completed_at)}` : ""}.
            Berkas terkunci permanen.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-start">
        {/* Main column */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Reviewer Action Panel for Kepala Ruangan */}
          {isHeadOfRoom && (report.status === "SUBMITTED" || report.status === "UNDER_REVIEW") && (
            <HeadRoomReviewPanel
              onAssignRiskGrade={async (grade, notes) => {
                await assignRiskGrade(
                  report.id,
                  grade,
                  report.row_version,
                  notes,
                  csrfToken ?? undefined,
                )
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
              onSkipInvestigation={async () => {
                await skipInvestigation(report.id, report.row_version, csrfToken ?? undefined)
                await loadReport()
              }}
              onStartInvestigation={async () => {
                await startInvestigation(report.id, report.row_version, csrfToken ?? undefined)
                await loadReport()
              }}
              report={report}
            />
          )}

          {/* Simple Investigation Worksheet (BIRU / HIJAU) */}
          {showsInvestigationWorksheet(report) && (
            <InvestigationWorksheet
              canEdit={isHeadOfRoom && report.status === "SIMPLE_INVESTIGATION"}
              investigation={report.investigation}
              onComplete={async () => {
                await completeInvestigation(
                  report.id,
                  report.row_version,
                  csrfToken ?? undefined,
                )
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

          {/* Kronologi Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Kronologi Insiden (5W+1H)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="rounded-lg border bg-muted/25 p-4 text-sm leading-6 whitespace-pre-wrap">
                {report.chronology || "(Kronologi belum diisi)"}
              </p>
              <DefinitionGrid
                items={[
                  {
                    label: "Tindakan segera & hasilnya",
                    value: (
                      <span className="whitespace-pre-wrap">
                        {report.immediate_action_and_result || "-"}
                      </span>
                    ),
                    wide: true,
                  },
                  { label: "Tindakan dilakukan oleh", value: report.action_taken_by || "-" },
                  {
                    label: "Kejadian serupa pernah terjadi",
                    value: report.similar_incident_occurred
                      ? report.similar_incident_occurred === "YA"
                        ? "Ya"
                        : report.similar_incident_occurred === "TIDAK"
                          ? "Tidak"
                          : "Tidak tahu"
                      : "-",
                  },
                  ...(report.similar_incident_details
                    ? [
                        {
                          label: "Riwayat kejadian serupa",
                          value: (
                            <span className="whitespace-pre-wrap">{report.similar_incident_details}</span>
                          ),
                          wide: true,
                        },
                      ]
                    : []),
                ]}
              />
            </CardContent>
          </Card>

          {/* Data Pasien + Kejadian */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Data Pasien</CardTitle>
              </CardHeader>
              <CardContent>
                <DefinitionGrid
                  className="grid-cols-1"
                  items={[
                    { label: "Nama pasien", value: report.patient_name || "-" },
                    {
                      label: "Nomor rekam medis",
                      value: report.medical_record_number ? (
                        <span className="font-mono text-xs">{report.medical_record_number}</span>
                      ) : (
                        "-"
                      ),
                    },
                    { label: "Ruangan / bangsal", value: report.patient_room || "-" },
                    { label: "Kelompok umur", value: report.patient_age_category || "-" },
                    {
                      label: "Jenis kelamin",
                      value:
                        report.patient_gender === "LAKI_LAKI"
                          ? "Laki-laki"
                          : report.patient_gender === "PEREMPUAN"
                            ? "Perempuan"
                            : "-",
                    },
                    { label: "Penanggung biaya", value: report.patient_payer_type || "-" },
                    { label: "Jenis pelayanan", value: report.patient_care_type || "-" },
                    {
                      label: "Masuk rumah sakit",
                      value: formatTanggalWaktu(report.admission_datetime),
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Data Kejadian</CardTitle>
              </CardHeader>
              <CardContent>
                <DefinitionGrid
                  className="grid-cols-1"
                  items={[
                    {
                      label: "Waktu insiden",
                      value: `${formatTanggalWaktu(report.incident_datetime)} ${report.incident_timezone === "Asia/Makassar" ? "WITA" : ""}`.trim(),
                    },
                    {
                      label: "Jenis insiden",
                      value: INCIDENT_TYPE_LABELS[report.incident_type],
                    },
                    {
                      label: "Sasaran insiden",
                      value: `${INCIDENT_TARGET_LABELS[report.incident_target]}${
                        report.incident_target_other ? ` (${report.incident_target_other})` : ""
                      }`,
                    },
                    {
                      label: "Pelapor pertama",
                      value: <InitialReportersList report={report} />,
                    },
                    { label: "Lokasi kejadian", value: report.incident_location || "-" },
                    { label: "Spesialisasi klinis", value: report.clinical_specialization || "-" },
                    { label: "Unit penyebab", value: report.causing_unit || "-" },
                    { label: "Derajat cedera", value: report.patient_impact || "-" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          {/* Audit Timeline Section */}
          <AuditTimelineView records={auditRecords} />
        </div>

        {/* Side rail */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Informasi Laporan</CardTitle>
            </CardHeader>
            <CardContent>
              <DefinitionGrid
                className="grid-cols-1"
                items={[
                  {
                    label: "Nomor laporan",
                    value: report.report_number ? (
                      <span className="font-mono text-xs">{report.report_number}</span>
                    ) : (
                      "Draf (belum bernomor)"
                    ),
                  },
                  {
                    label: "Status",
                    value: <IncidentStatusBadge status={report.status} />,
                  },
                  { label: "Pita risiko", value: <RiskBadge grade={report.risk_grade} /> },
                  { label: "Pelapor", value: report.reporter_name },
                  { label: "Peran pelapor", value: report.reporter_role },
                  { label: "Unit", value: report.owning_unit_id },
                  { label: "Dibuat", value: formatTanggalWaktu(report.created_at) },
                  { label: "Dikirim", value: formatTanggalWaktu(report.submitted_at) },
                  ...(report.completed_at
                    ? [{ label: "Ditutup", value: formatTanggalWaktu(report.completed_at) }]
                    : []),
                ]}
              />
            </CardContent>
          </Card>

          {report.overdue_reason && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Catatan Keterlambatan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                  {report.overdue_reason}
                </p>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

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
      <ConfirmDialog
        busy={isDeleting}
        cancelLabel="Batal"
        confirmLabel="Hapus Laporan"
        description="Administrator akan menghapus laporan ini secara permanen, termasuk data terkait. Tindakan ini tidak dapat dibatalkan."
        onConfirm={() => {
          setIsDeleting(true)
          void deleteIncident(report.id, csrfToken ?? undefined)
            .then(() => { void navigate("/laporan", { replace: true }) })
            .catch((error: unknown) => { setShowDeleteConfirm(false); setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus laporan.") })
            .finally(() => { setIsDeleting(false) })
        }}
        onOpenChange={setShowDeleteConfirm}
        open={showDeleteConfirm}
        title="Hapus laporan ini?"
        tone="destructive"
      />
    </div>
  )
}
