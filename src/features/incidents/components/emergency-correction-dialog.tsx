import { useState, type SyntheticEvent } from "react"
import { IconAlertTriangle, IconChevronDown, IconEdit } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { IncidentReport, RiskGrade } from "../types/incident"

interface EmergencyCorrectionDialogProps {
  report: IncidentReport
  isOpen: boolean
  onClose: () => void
  onSubmitCorrection: (reason: string, fields: Partial<IncidentReport>) => Promise<void>
}

const RISK_OPTIONS: Array<{ value: RiskGrade | ""; label: string }> = [
  { value: "", label: "-- Tidak diubah --" },
  { value: "BIRU", label: "Biru (Rendah)" },
  { value: "HIJAU", label: "Hijau (Sedang)" },
  { value: "KUNING", label: "Kuning (Tinggi)" },
  { value: "MERAH", label: "Merah (Ekstrem)" },
]

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
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
      open={isOpen}
    >
      <DialogContent className="gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-3.5 pr-14 sm:px-5 sm:pr-14">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <IconEdit aria-hidden="true" className="size-4 text-primary" />
            Koreksi Darurat Kepala Ruangan
          </DialogTitle>
          <DialogDescription className="text-xs">
            Wewenang khusus Kepala Ruangan pada status Terkirim / Sedang Ditinjau untuk memperbaiki
            data klinis atau nomor rekam medis darurat.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex max-h-[75dvh] flex-col gap-4 overflow-y-auto px-4 py-4 text-sm sm:px-5"
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
        >
          {errorMsg && (
            <p
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive"
              role="alert"
            >
              {errorMsg}
            </p>
          )}

          {/* Mandatory reason */}
          <div className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <FieldLabel className="text-sm font-semibold" htmlFor="correction_reason">
                Alasan Koreksi Darurat{" "}
                <span aria-hidden="true" className="text-destructive">*</span>
              </FieldLabel>
              <span className="text-[11px] text-muted-foreground">1–500 karakter</span>
            </div>
            <Textarea
              className="min-h-16 bg-background"
              id="correction_reason"
              onChange={(e) => {
                setReason(e.target.value)
              }}
              placeholder="Contoh: Pembaruan nomor rekam medis definitif menggantikan nomor darurat…"
              required
              rows={2}
              value={reason}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="corr_patient_name">Nama Pasien</FieldLabel>
              <Input
                className="h-10"
                id="corr_patient_name"
                onChange={(e) => {
                  setPatientName(e.target.value)
                }}
                type="text"
                value={patientName}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="corr_mr">Nomor Rekam Medis</FieldLabel>
              <Input
                className="h-10"
                id="corr_mr"
                onChange={(e) => {
                  setMrNumber(e.target.value)
                }}
                type="text"
                value={mrNumber}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="corr_room">Ruangan / Bangsal</FieldLabel>
              <Input
                className="h-10"
                id="corr_room"
                onChange={(e) => {
                  setRoom(e.target.value)
                }}
                type="text"
                value={room}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="corr_risk_grade">Pita Grading Risiko</FieldLabel>
              <div className="relative">
                <select
                  className={cn(
                    "h-10 w-full appearance-none rounded-lg border border-input bg-transparent px-2.5 pr-8 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-8 md:text-sm dark:bg-input/30",
                  )}
                  id="corr_risk_grade"
                  onChange={(e) => {
                    setRiskGrade(e.target.value as RiskGrade | "")
                  }}
                  value={riskGrade}
                >
                  {RISK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <IconChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="corr_title">Judul Insiden</FieldLabel>
              <Input
                className="h-10"
                id="corr_title"
                onChange={(e) => {
                  setTitle(e.target.value)
                }}
                type="text"
                value={title}
              />
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="corr_chronology">Kronologi Insiden (5W+1H)</FieldLabel>
              <Textarea
                className="min-h-20"
                id="corr_chronology"
                onChange={(e) => {
                  setChronology(e.target.value)
                }}
                rows={3}
                value={chronology}
              />
            </Field>
          </div>

          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <IconAlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-status-warning-foreground" />
            Setiap koreksi menghasilkan satu entri jejak audit "Koreksi Darurat".
          </p>

          <div className="-mx-4 -mb-4 mt-auto flex flex-col-reverse gap-2 border-t bg-muted/40 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
            <Button disabled={isSubmitting} onClick={onClose} type="button" variant="ghost">
              Batal
            </Button>
            <Button className="font-medium" disabled={isSubmitting} type="submit">
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {isSubmitting ? "Menyimpan…" : "Simpan Koreksi"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
