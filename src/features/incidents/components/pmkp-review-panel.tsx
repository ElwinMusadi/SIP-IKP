import { useState, type SyntheticEvent } from "react"
import { IconDeviceFloppy, IconFolderShare, IconShieldCheck } from "@tabler/icons-react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
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
      setShowConfirmModal(false)
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyelesaikan kasus.")
    } finally {
      setIsFinalizing(false)
    }
  }

  return (
    <section
      aria-labelledby="section-pmkp-title"
      className="flex flex-col gap-4 rounded-xl border-2 border-status-pending-foreground/20 bg-status-pending/[0.04] p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-status-pending-foreground/15 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base" id="section-pmkp-title">
            Tinjauan Mutu Komite PMKP &amp; Serah Terima RCA
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pengawasan mutu untuk insiden risiko tinggi (Kuning/Merah) dan serah terima investigasi
            komprehensif / RCA.
          </p>
        </div>
        {isReviewed && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success px-3 py-1 text-xs font-semibold text-status-success-foreground">
            <IconShieldCheck className="size-3.5" />
            Tinjauan selesai
          </span>
        )}
      </header>

      {message && (
        <p
          className="rounded-lg bg-status-success px-3 py-2.5 text-xs font-medium text-status-success-foreground"
          role="status"
        >
          {message}
        </p>
      )}

      {errorMsg && (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive"
          role="alert"
        >
          {errorMsg}
        </p>
      )}

      {/* Catatan Awal Mitigasi Unit */}
      {report.high_risk_mitigation_notes && (
        <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
          <span className="text-xs font-semibold text-foreground">
            Catatan awal mitigasi dari Kepala Ruangan:
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
        <Field>
          <FieldLabel htmlFor="pmkp_notes">
            Catatan Arahan &amp; Evaluasi Komite PMKP (opsional)
          </FieldLabel>
          <Textarea
            className="min-h-20"
            disabled={!canEditNotes || isReviewed}
            id="pmkp_notes"
            onChange={(e) => {
              setReviewNotes(e.target.value)
            }}
            placeholder="Tuliskan arahan Komite PMKP terkait investigasi komprehensif atau pembentukan tim RCA…"
            rows={3}
            value={reviewNotes}
          />
        </Field>

        {canEditNotes && !isReviewed && (
          <div>
            <Button disabled={isSaving} size="sm" type="submit" variant="outline">
              {isSaving ? <Spinner data-icon="inline-start" /> : <IconDeviceFloppy data-icon="inline-start" />}
              {isSaving ? "Menyimpan…" : "Simpan Catatan"}
            </Button>
          </div>
        )}
      </form>

      {/* Action: Finalisasi Serah Terima RCA */}
      {canFinalize && !isReviewed && (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <IconFolderShare className="size-4" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-foreground sm:text-sm">
                Serah terima investigasi komprehensif / RCA
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                Pelaporan SIP-IKP diselesaikan setelah berkas diserahterimakan ke tim investigasi
                komprehensif RSUD Prof. Dr. W. Z. Johannes. RCA lanjutan berlangsung di luar
                aplikasi ini.
              </p>
            </div>
          </div>

          <div>
            <Button
              className="font-medium"
              disabled={isFinalizing}
              onClick={() => {
                setShowConfirmModal(true)
              }}
              size="sm"
            >
              <IconFolderShare data-icon="inline-start" />
              Serah Terima &amp; Tutup Kasus
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        busy={isFinalizing}
        cancelLabel="Batal"
        confirmLabel="Ya, Tutup Kasus"
        description="Pastikan berkas telah diserahterimakan ke tim investigasi komprehensif. Laporan akan berstatus Selesai dan dikunci permanen."
        onConfirm={() => {
          void handleConfirmFinalize()
        }}
        onOpenChange={setShowConfirmModal}
        open={showConfirmModal}
        title="Konfirmasi penyelesaian kasus"
      />
    </section>
  )
}
