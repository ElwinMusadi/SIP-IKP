import { useState } from "react"
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconCheck,
  IconClockPlay,
  IconEdit,
  IconPlayerPlay,
} from "@tabler/icons-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { RISK_GRADE_META } from "../lib/labels"
import { needsInvestigationDecision, showsRiskGrading } from "../lib/workflow-view"
import type { IncidentReport, RiskGrade } from "../types/incident"
import { cn } from "@/lib/utils"
import { SeverityReference } from "./severity-reference"

interface HeadRoomReviewPanelProps {
  report: IncidentReport
  onReceive: () => Promise<void>
  onRequestRevision: (reason?: string) => Promise<void>
  onAssignRiskGrade: (grade: RiskGrade, mitigationNotes?: string) => Promise<void>
  onStartInvestigation: () => Promise<void>
  onSkipInvestigation: () => Promise<void>
  onOpenEmergencyCorrection: () => void
}

const GRADE_ORDER: RiskGrade[] = ["BIRU", "HIJAU", "KUNING", "MERAH"]

export function HeadRoomReviewPanel({
  report,
  onReceive,
  onRequestRevision,
  onAssignRiskGrade,
  onStartInvestigation,
  onSkipInvestigation,
  onOpenEmergencyCorrection,
}: HeadRoomReviewPanelProps) {
  const [selectedGrade, setSelectedGrade] = useState<RiskGrade>("BIRU")
  const [mitigationNotes, setMitigationNotes] = useState("")
  const [revisionReason, setRevisionReason] = useState("")
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingAction, setPendingAction] = useState<"start" | "skip" | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleReceive = async () => {
    setErrorMsg(null)
    setIsProcessing(true)
    try {
      await onReceive()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menerima laporan.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRevisionSubmit = async () => {
    setErrorMsg(null)
    setIsProcessing(true)
    try {
      await onRequestRevision(revisionReason.trim() || undefined)
      setShowRevisionModal(false)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal meminta revisi.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGradeSubmit = async () => {
    setErrorMsg(null)
    if ((selectedGrade === "KUNING" || selectedGrade === "MERAH") && !mitigationNotes.trim()) {
      setErrorMsg("Catatan awal mitigasi wajib diisi untuk risiko KUNING atau MERAH.")
      return
    }

    setIsProcessing(true)
    try {
      await onAssignRiskGrade(selectedGrade, mitigationNotes.trim() || undefined)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menetapkan grading risiko.")
    } finally {
      setIsProcessing(false)
    }
  }

  const needsHighRiskNotes = selectedGrade === "KUNING" || selectedGrade === "MERAH"
  const showDecision = needsInvestigationDecision(report)

  const handleInvestigationDecision = async (action: "start" | "skip") => {
    if (pendingAction) return
    setErrorMsg(null)
    setPendingAction(action)
    try {
      if (action === "start") {
        await onStartInvestigation()
      } else {
        await onSkipInvestigation()
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : action === "start"
            ? "Gagal memulai investigasi sederhana."
            : "Gagal menyelesaikan laporan tanpa investigasi.",
      )
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <section
      aria-labelledby="panel-review-title"
      className="flex flex-col gap-4 rounded-xl border-2 border-primary/25 bg-primary/[0.03] p-4 sm:p-5"
    >
      <header className="border-b border-primary/15 pb-3">
        <h2 className="text-sm font-semibold text-foreground sm:text-base" id="panel-review-title">
          Peninjauan Kepala Ruangan
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Verifikasi penerimaan, penetapan pita risiko, permintaan revisi, dan koreksi darurat.
        </p>
      </header>

      {errorMsg && (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          role="alert"
        >
          {errorMsg}
        </p>
      )}

      {/* Action 1: Terima Laporan jika masih SUBMITTED */}
      {report.status === "SUBMITTED" && (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground sm:text-sm">
            Laporan berstatus <strong className="font-semibold text-foreground">Terkirim</strong>.
            Konfirmasikan penerimaan untuk memulai peninjauan.
          </p>
          <Button
            className="shrink-0 font-medium"
            disabled={isProcessing}
            onClick={() => {
              void handleReceive()
            }}
            size="sm"
          >
            {isProcessing ? <Spinner data-icon="inline-start" /> : <IconClockPlay data-icon="inline-start" />}
            Terima &amp; Mulai Peninjauan
          </Button>
        </div>
      )}

      {/* Action 2: Penetapan Grading Risiko jika UNDER_REVIEW */}
      {showsRiskGrading(report) && (
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Penetapan Pita Grading Risiko</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Biru/Hijau dilanjutkan ke pilihan tindak lanjut unit; Kuning/Merah dieskalasi ke
              Komite PMKP.
            </p>
          </div>

          <SeverityReference />

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="radiogroup" aria-label="Pita grading risiko">
            {GRADE_ORDER.map((grade) => {
              const meta = RISK_GRADE_META[grade]
              const selected = selectedGrade === grade
              return (
                <button
                  aria-checked={selected}
                  className={cn(
                    "flex min-h-16 flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                    selected
                      ? cn("ring-2 ring-offset-1 ring-offset-card", meta.badgeClass, "ring-current font-semibold")
                      : "bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/50",
                  )}
                  key={grade}
                  onClick={() => {
                    setSelectedGrade(grade)
                  }}
                  role="radio"
                  type="button"
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
                    <span aria-hidden="true" className={cn("size-2.5 rounded-full", meta.dotClass)} />
                    {meta.label}
                  </span>
                  <span className={cn("text-[10px] leading-tight", selected ? "opacity-80" : "text-muted-foreground")}>
                    {grade === "BIRU" || grade === "HIJAU" ? "Keputusan unit" : "Eskalasi PMKP"}
                  </span>
                </button>
              )
            })}
          </div>

          {needsHighRiskNotes && (
            <Field>
              <FieldLabel className="text-destructive" htmlFor="high_risk_mitigation">
                Catatan Awal Mitigasi &amp; Pencegahan Segera{" "}
                <span aria-hidden="true">*</span>
              </FieldLabel>
              <Textarea
                className="min-h-16"
                id="high_risk_mitigation"
                onChange={(event) => {
                  setMitigationNotes(event.target.value)
                }}
                placeholder="Tuliskan tindakan pengamanan klinis darurat sebelum eskalasi ke Komite PMKP…"
                rows={2}
                value={mitigationNotes}
              />
              <FieldDescription>
                Wajib untuk pita Kuning/Merah — menjadi catatan awal bagi Komite PMKP.
              </FieldDescription>
            </Field>
          )}

          <div>
            <Button
              className="font-medium"
              disabled={isProcessing}
              onClick={() => {
                void handleGradeSubmit()
              }}
              size="sm"
            >
              {isProcessing ? <Spinner data-icon="inline-start" /> : <IconCheck data-icon="inline-start" />}
              Tetapkan {RISK_GRADE_META[selectedGrade].label}
            </Button>
          </div>
        </div>
      )}

      {showDecision && (
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-foreground">
              Apakah laporan ini perlu dilanjutkan ke Investigasi Sederhana?
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Grading {report.risk_grade ? RISK_GRADE_META[report.risk_grade].label : "risiko"}{" "}
              telah tersimpan. Pilih tindak lanjut berdasarkan kebutuhan penelusuran penyebab dan
              rencana perbaikan unit.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              className="w-full whitespace-nowrap sm:w-auto"
              disabled={pendingAction !== null}
              onClick={() => {
                void handleInvestigationDecision("start")
              }}
            >
              {pendingAction === "start" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <IconPlayerPlay data-icon="inline-start" />
              )}
              {pendingAction === "start" ? "Memulai…" : "Lanjut ke Investigasi Sederhana"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger
                disabled={pendingAction !== null}
                render={
                  <Button
                    className="w-full whitespace-normal sm:w-auto sm:whitespace-nowrap"
                    variant="outline"
                  />
                }
              >
                Selesaikan Tanpa Investigasi
              </AlertDialogTrigger>
              <AlertDialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle>Selesaikan laporan tanpa investigasi?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Laporan akan ditutup permanen sebagai selesai di tingkat unit tanpa lembar
                    investigasi. Setelah dikonfirmasi, laporan terkunci dan tidak dapat diedit
                    melalui alur normal.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={pendingAction !== null}>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={pendingAction !== null}
                    onClick={() => {
                      void handleInvestigationDecision("skip")
                    }}
                    variant="destructive"
                  >
                    {pendingAction === "skip" && <Spinner data-icon="inline-start" />}
                    {pendingAction === "skip" ? "Menyelesaikan…" : "Ya, Selesaikan Permanen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Action 3: Request Revision & Emergency Correction buttons */}
      {!showDecision && (
        <div className="flex flex-wrap items-center gap-2 border-t border-primary/15 pt-3">
          <Button
            disabled={isProcessing}
            onClick={() => {
              setShowRevisionModal(true)
            }}
            size="sm"
            variant="outline"
          >
            <IconArrowBackUp data-icon="inline-start" />
            Minta Perbaikan
          </Button>
          <Button
            disabled={isProcessing}
            onClick={onOpenEmergencyCorrection}
            size="sm"
            variant="outline"
          >
            <IconEdit data-icon="inline-start" />
            Koreksi Darurat
          </Button>
        </div>
      )}

      {/* Dialog for Revision Request */}
      <Dialog onOpenChange={setShowRevisionModal} open={showRevisionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-10">
            <DialogTitle className="flex items-center gap-2">
              <IconAlertTriangle aria-hidden="true" className="size-4 text-status-warning-foreground" />
              Minta Perbaikan Laporan
            </DialogTitle>
            <DialogDescription>
              Laporan dikembalikan ke pelapor dengan status{" "}
              <strong className="font-semibold text-foreground">Perlu Perbaikan</strong>. Hanya
              pembuat laporan yang dapat memperbaiki dan mengirim ulang.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="revision_reason">Alasan / Arahan Perbaikan (opsional)</FieldLabel>
            <Textarea
              className="min-h-20"
              id="revision_reason"
              onChange={(event) => {
                setRevisionReason(event.target.value)
              }}
              placeholder="Tuliskan arahan perbaikan data jika diperlukan…"
              rows={3}
              value={revisionReason}
            />
          </Field>

          <DialogFooter>
            <Button
              disabled={isProcessing}
              onClick={() => {
                setShowRevisionModal(false)
              }}
              variant="ghost"
            >
              Batal
            </Button>
            <Button
              disabled={isProcessing}
              onClick={() => {
                void handleRevisionSubmit()
              }}
            >
              {isProcessing && <Spinner data-icon="inline-start" />}
              Kirim Permintaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
