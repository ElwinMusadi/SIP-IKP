import { useState } from "react"
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconCheck,
  IconClockPlay,
  IconEdit,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import type { IncidentReport, RiskGrade } from "../types/incident"

interface HeadRoomReviewPanelProps {
  report: IncidentReport
  onReceive: () => Promise<void>
  onRequestRevision: (reason?: string) => Promise<void>
  onAssignRiskGrade: (grade: RiskGrade, mitigationNotes?: string) => Promise<void>
  onOpenEmergencyCorrection: () => void
}

export function HeadRoomReviewPanel({
  report,
  onReceive,
  onRequestRevision,
  onAssignRiskGrade,
  onOpenEmergencyCorrection,
}: HeadRoomReviewPanelProps) {
  const [selectedGrade, setSelectedGrade] = useState<RiskGrade>("BIRU")
  const [mitigationNotes, setMitigationNotes] = useState("")
  const [revisionReason, setRevisionReason] = useState("")
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
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

  return (
    <div className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-xs">
      <div className="border-b pb-3">
        <h2 className="text-base font-semibold text-foreground">
          Panel Peninjauan Kepala Ruangan IBS
        </h2>
        <p className="text-xs text-muted-foreground">
          Tindakan verifikasi penerimaan laporan, perbaikan/revisi, penetapan grading risiko, dan
          koreksi darurat.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Action 1: Terima Laporan jika masih SUBMITTED */}
      {report.status === "SUBMITTED" && (
        <div className="flex flex-col gap-2 rounded-lg border bg-sky-50/50 p-4 dark:bg-sky-950/20">
          <p className="text-xs font-medium text-foreground">
            Laporan ini berstatus <strong>SUBMITTED</strong>. Konfirmasikan penerimaan untuk memulai
            peninjauan.
          </p>
          <div>
            <Button
              className="gap-1.5 font-medium"
              disabled={isProcessing}
              onClick={() => {
                void handleReceive()
              }}
              size="sm"
            >
              <IconClockPlay className="size-4" />
              <span>Terima &amp; Mulai Peninjauan (UNDER_REVIEW)</span>
            </Button>
          </div>
        </div>
      )}

      {/* Action 2: Penetapan Grading Risiko jika UNDER_REVIEW */}
      {report.status === "UNDER_REVIEW" && (
        <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Penetapan Pita Grading Risiko</h3>
            <p className="text-xs text-muted-foreground">
              Pilih pita risiko secara klinis. BIRU/HIJAU akan masuk Simple Investigation;
              KUNING/MERAH eskalasi ke PMKP.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["BIRU", "HIJAU", "KUNING", "MERAH"] as RiskGrade[]).map((grade) => (
              <button
                className={`flex flex-col items-center justify-center rounded-lg border p-3 text-xs font-medium transition-colors ${
                  selectedGrade === grade
                    ? "border-primary bg-primary/10 text-primary font-semibold ring-2 ring-primary/20"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
                key={grade}
                onClick={() => {
                  setSelectedGrade(grade)
                }}
                type="button"
              >
                <span>Risiko {grade}</span>
                <span className="text-[10px] text-muted-foreground">
                  {grade === "BIRU" || grade === "HIJAU" ? "Investigasi Unit" : "Eskalasi PMKP"}
                </span>
              </button>
            ))}
          </div>

          {(selectedGrade === "KUNING" || selectedGrade === "MERAH") && (
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium text-destructive"
                htmlFor="high_risk_mitigation"
              >
                Catatan Awal Mitigasi &amp; Tindakan Pencegahan Segera{" "}
                <span className="text-destructive">*</span>
              </label>
              <textarea
                className="min-h-16 w-full rounded-lg border bg-background p-2.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="high_risk_mitigation"
                onChange={(e) => {
                  setMitigationNotes(e.target.value)
                }}
                placeholder="Tuliskan tindakan pengamanan klinis darurat sebelum eskalasi ke Komite PMKP..."
                rows={2}
                value={mitigationNotes}
              />
            </div>
          )}

          <div>
            <Button
              className="gap-1.5 font-medium"
              disabled={isProcessing}
              onClick={() => {
                void handleGradeSubmit()
              }}
              size="sm"
            >
              <IconCheck className="size-4" />
              <span>Tetapkan Pita Risiko ({selectedGrade}) &amp; Lanjutkan Alur</span>
            </Button>
          </div>
        </div>
      )}

      {/* Action 3: Request Revision & Emergency Correction buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        {(report.status === "SUBMITTED" || report.status === "UNDER_REVIEW") && (
          <Button
            className="gap-1.5 text-xs"
            disabled={isProcessing}
            onClick={() => {
              setShowRevisionModal(true)
            }}
            size="sm"
            variant="outline"
          >
            <IconArrowBackUp className="size-3.5 text-amber-600" />
            <span>Minta Perbaikan / Revisi ke Pelapor</span>
          </Button>
        )}

        {(report.status === "SUBMITTED" || report.status === "UNDER_REVIEW") && (
          <Button
            className="gap-1.5 text-xs"
            disabled={isProcessing}
            onClick={onOpenEmergencyCorrection}
            size="sm"
            variant="outline"
          >
            <IconEdit className="size-3.5 text-primary" />
            <span>Koreksi Darurat Kepala Ruangan</span>
          </Button>
        )}
      </div>

      {/* Modal Dialog for Revision Request */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border bg-card p-6 shadow-lg">
            <div className="flex items-center gap-2 text-amber-600">
              <IconAlertTriangle className="size-5" />
              <h3 className="text-base font-semibold text-foreground">
                Minta Perbaikan / Revisi Laporan
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Laporan akan dikembalikan ke status <strong>REVISION_REQUIRED</strong>. Hanya pembuat
              draf yang dapat memperbaiki dan mengirimkan kembali.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground" htmlFor="revision_reason">
                Alasan / Arahan Perbaikan (Opsional)
              </label>
              <textarea
                className="min-h-20 w-full rounded-lg border bg-background p-2.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="revision_reason"
                onChange={(e) => {
                  setRevisionReason(e.target.value)
                }}
                placeholder="Tuliskan arahan perbaikan data jika diperlukan..."
                rows={3}
                value={revisionReason}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                disabled={isProcessing}
                onClick={() => {
                  setShowRevisionModal(false)
                }}
                size="sm"
                variant="ghost"
              >
                Batal
              </Button>
              <Button
                className="gap-1.5"
                disabled={isProcessing}
                onClick={() => {
                  void handleRevisionSubmit()
                }}
                size="sm"
                variant="default"
              >
                <IconArrowBackUp className="size-4" />
                <span>Kirim Permintaan Revisi</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
