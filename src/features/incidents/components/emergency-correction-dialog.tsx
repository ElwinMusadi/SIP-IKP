import { useState, type SyntheticEvent } from "react"
import { IconAlertTriangle, IconEdit } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import type { IncidentReport, RiskGrade } from "../types/incident"

interface EmergencyCorrectionDialogProps {
  report: IncidentReport
  isOpen: boolean
  onClose: () => void
  onSubmitCorrection: (reason: string, fields: Partial<IncidentReport>) => Promise<void>
}

export function EmergencyCorrectionDialog({
  report,
  isOpen,
  onClose,
  onSubmitCorrection,
}: EmergencyCorrectionDialogProps) {
  const [reason, setReason] = useState("")
  const [patientName, setPatientName] = useState(report.patient_name ?? "")
  const [mrNumber, setMrNumber] = useState(report.medical_record_number ?? "")
  const [room, setRoom] = useState(report.patient_room ?? "")
  const [title, setTitle] = useState(report.incident_title ?? "")
  const [chronology, setChronology] = useState(report.chronology ?? "")
  const [riskGrade, setRiskGrade] = useState<RiskGrade | "">(report.risk_grade ?? "")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) {
    return null
  }

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedReason = reason.trim()
    if (!trimmedReason || trimmedReason.length > 500) {
      setErrorMsg("Alasan koreksi darurat wajib diisi (1–500 karakter).")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmitCorrection(trimmedReason, {
        patient_name: patientName.trim() || null,
        medical_record_number: mrNumber.trim() || null,
        patient_room: room.trim() || null,
        incident_title: title.trim() || null,
        chronology: chronology.trim() || null,
        risk_grade: riskGrade ? riskGrade : null,
      })
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan koreksi darurat.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl">
        <header className="flex items-center gap-2.5 border-b pb-3 text-primary">
          <IconEdit className="size-6" />
          <div>
            <h3 className="text-base font-bold text-foreground">
              Koreksi Darurat Kepala Ruangan IBS
            </h3>
            <p className="text-xs text-muted-foreground">
              Wewenang khusus Kepala Ruangan pada status SUBMITTED / UNDER_REVIEW untuk memperbaiki
              data klinis atau nomor MR darurat.
            </p>
          </div>
        </header>

        {errorMsg && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
            {errorMsg}
          </div>
        )}

        <form
          className="flex flex-col gap-4 text-xs"
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
        >
          {/* Mandatory reason */}
          <div className="flex flex-col gap-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground" htmlFor="correction_reason">
                Alasan Koreksi Darurat <span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground">Wajib (1–500 karakter)</span>
            </div>
            <textarea
              className="min-h-16 w-full rounded-md border bg-background p-2.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="correction_reason"
              onChange={(e) => {
                setReason(e.target.value)
              }}
              placeholder="Contoh: Pembaruan nomor MR definitif dari Rekam Medis menggantikan nomor darurat..."
              required
              rows={2}
              value={reason}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-foreground" htmlFor="corr_patient_name">
                Nama Pasien
              </label>
              <input
                className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                id="corr_patient_name"
                onChange={(e) => {
                  setPatientName(e.target.value)
                }}
                type="text"
                value={patientName}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-foreground" htmlFor="corr_mr">
                Nomor Rekam Medis (No. MR)
              </label>
              <input
                className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                id="corr_mr"
                onChange={(e) => {
                  setMrNumber(e.target.value)
                }}
                type="text"
                value={mrNumber}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-foreground" htmlFor="corr_room">
                Ruangan / Bangsal
              </label>
              <input
                className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                id="corr_room"
                onChange={(e) => {
                  setRoom(e.target.value)
                }}
                type="text"
                value={room}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-foreground" htmlFor="corr_risk_grade">
                Pita Grading Risiko
              </label>
              <select
                className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                id="corr_risk_grade"
                onChange={(e) => {
                  setRiskGrade(e.target.value as RiskGrade | "")
                }}
                value={riskGrade}
              >
                <option value="">-- Tidak Diubah --</option>
                <option value="BIRU">BIRU (Rendah)</option>
                <option value="HIJAU">HIJAU (Sedang)</option>
                <option value="KUNING">KUNING (Tinggi)</option>
                <option value="MERAH">MERAH (Ekstrem)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="font-medium text-foreground" htmlFor="corr_title">
                Judul Insiden
              </label>
              <input
                className="w-full rounded-md border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                id="corr_title"
                onChange={(e) => {
                  setTitle(e.target.value)
                }}
                type="text"
                value={title}
              />
            </div>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="font-medium text-foreground" htmlFor="corr_chronology">
                Kronologi Insiden (5W+1H)
              </label>
              <textarea
                className="min-h-20 w-full rounded-md border bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                id="corr_chronology"
                onChange={(e) => {
                  setChronology(e.target.value)
                }}
                rows={3}
                value={chronology}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <IconAlertTriangle className="size-3.5 text-amber-500" />
              <span>Satu tindakan koreksi menghasilkan satu event audit EMERGENCY_CORRECTION.</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                disabled={isSubmitting}
                onClick={onClose}
                size="sm"
                type="button"
                variant="ghost"
              >
                Batal
              </Button>
              <Button disabled={isSubmitting} size="sm" type="submit">
                {isSubmitting ? "Menyimpan..." : "Simpan Koreksi Darurat"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
