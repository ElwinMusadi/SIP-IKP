import { useState, type SyntheticEvent } from "react"
import { IconCheck, IconDeviceFloppy, IconFolderShare, IconShieldCheck } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import type { IncidentReport } from "../types/incident"

interface PmkpReviewPanelProps {
  report: IncidentReport
  canEditNotes: boolean
  canFinalize: boolean
  onSaveNotes: (notes: string) => Promise<void>
  onFinalize: () => Promise<void>
}

export function PmkpReviewPanel({
  report,
  canEditNotes,
  canFinalize,
  onSaveNotes,
  onFinalize,
}: PmkpReviewPanelProps) {
  const [reviewNotes, setReviewNotes] = useState(report.pmkp_review_notes ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isReviewed = Boolean(report.pmkp_reviewed)

  const handleSaveNotes = async (e: SyntheticEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setMessage(null)
    setIsSaving(true)
    try {
      await onSaveNotes(reviewNotes)
      setMessage("Catatan tinjauan PMKP berhasil disimpan.")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan catatan PMKP.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmFinalize = async () => {
    setErrorMsg(null)
    setMessage(null)
    setIsFinalizing(true)
    try {
      await onFinalize()
      setShowConfirmModal(false)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyelesaikan kasus.")
    } finally {
      setIsFinalizing(false)
    }
  }

  return (
    <section
      aria-labelledby="section-pmkp-title"
      className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-xs"
    >
      <div className="border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              className="text-lg font-bold tracking-tight text-foreground"
              id="section-pmkp-title"
            >
              Tinjauan Mutu Komite PMKP &amp; Serah Terima RCA
            </h2>
            <p className="text-xs text-muted-foreground">
              Pengawasan mutu rumah sakit untuk insiden risiko tinggi (KUNING / MERAH) dan serah
              terima investigasi komprehensif / RCA eksternal.
            </p>
          </div>
          {isReviewed && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <IconShieldCheck className="size-4" />
              <span>Tinjauan PMKP &amp; Serah Terima Selesai</span>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {message}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Catatan Awal Mitigasi Unit */}
      {report.high_risk_mitigation_notes && (
        <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-4">
          <span className="text-xs font-semibold text-foreground">
            Catatan Awal Mitigasi dari Kepala Ruangan IBS:
          </span>
          <p className="text-xs leading-5 text-muted-foreground whitespace-pre-wrap">
            {report.high_risk_mitigation_notes}
          </p>
        </div>
      )}

      {/* Form Catatan Tinjauan PMKP */}
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          void handleSaveNotes(e)
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="pmkp_notes">
            Catatan Arahan &amp; Evaluasi Komite PMKP (Opsional)
          </label>
          <textarea
            className="min-h-20 w-full rounded-lg border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={!canEditNotes || isReviewed}
            id="pmkp_notes"
            onChange={(e) => {
              setReviewNotes(e.target.value)
            }}
            placeholder="Tuliskan arahan Komite PMKP terkait investigasi komprehensif atau pembentukan tim RCA..."
            rows={3}
            value={reviewNotes}
          />
        </div>

        {canEditNotes && !isReviewed && (
          <div>
            <Button
              className="gap-1.5 text-xs"
              disabled={isSaving}
              size="sm"
              type="submit"
              variant="outline"
            >
              <IconDeviceFloppy className="size-3.5" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Catatan PMKP"}</span>
            </Button>
          </div>
        )}
      </form>

      {/* Action: Finalisasi Serah Terima RCA */}
      {canFinalize && !isReviewed && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <IconFolderShare className="size-4" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-foreground">
                Serah Terima Investigasi Komprehensif / RCA Eksternal
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                Pelaporan SIP-IKP diselesaikan setelah berkas diserahterimakan ke tim investigasi
                komprehensif RSUD Prof. Dr. W. Z. Johannes. Pelaksanaan RCA lanjutan berlangsung di
                luar siklus hidup aplikasi SIP-IKP.
              </p>
            </div>
          </div>

          <div>
            <Button
              className="gap-1.5 font-medium"
              disabled={isFinalizing}
              onClick={() => {
                setShowConfirmModal(true)
              }}
              size="sm"
            >
              <IconCheck className="size-4" />
              <span>Konfirmasi Serah Terima RCA &amp; Tutup Kasus (COMPLETED)</span>
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border bg-card p-6 shadow-lg">
            <div className="flex items-center gap-2 text-primary">
              <IconFolderShare className="size-6" />
              <h3 className="text-base font-semibold text-foreground">
                Konfirmasi Penyelesaian Kasus
              </h3>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Apakah Anda yakin telah melakukan serah terima investigasi komprehensif / RCA ke
              Komite PMKP? Status laporan akan menjadi <strong>COMPLETED</strong> dan dikunci secara
              permanen.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                disabled={isFinalizing}
                onClick={() => {
                  setShowConfirmModal(false)
                }}
                size="sm"
                variant="ghost"
              >
                Batal
              </Button>
              <Button
                className="gap-1.5"
                disabled={isFinalizing}
                onClick={() => {
                  void handleConfirmFinalize()
                }}
                size="sm"
                variant="default"
              >
                {isFinalizing ? "Memproses..." : "Ya, Selesaikan & Tutup Kasus"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
