import { useState, type SyntheticEvent } from "react"
import { IconCheck, IconDeviceFloppy, IconPlus, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { ActionItem, RecommendationItem, SimpleInvestigation } from "../types/incident"

interface InvestigationWorksheetProps {
  investigation?: SimpleInvestigation | null | undefined
  canEdit: boolean
  onSave: (data: {
    direct_cause: string
    underlying_root_cause: string
    investigation_start_date: string
    investigation_end_date: string
    recommendations: RecommendationItem[]
    actions: ActionItem[]
  }) => Promise<void>
  onComplete: () => Promise<void>
}

function parseRecommendations(raw?: string | RecommendationItem[]): RecommendationItem[] {
  if (Array.isArray(raw)) {
    return raw
  }
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw || "[]")
      if (Array.isArray(parsed)) {
        return parsed as RecommendationItem[]
      }
    } catch {
      // ignore
    }
  }
  return []
}

function parseActions(raw?: string | ActionItem[]): ActionItem[] {
  if (Array.isArray(raw)) {
    return raw
  }
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw || "[]")
      if (Array.isArray(parsed)) {
        return parsed as ActionItem[]
      }
    } catch {
      // ignore
    }
  }
  return []
}

interface ItemRowProps {
  item: { text: string; responsible: string; target_date: string }
  index: number
  idPrefix: string
  canEdit: boolean
  canRemove: boolean
  textLabel: string
  textPlaceholder: string
  onUpdate: (index: number, field: "text" | "responsible" | "target_date", value: string) => void
  onRemove: (index: number) => void
}

function ItemRow({
  item,
  index,
  idPrefix,
  canEdit,
  canRemove,
  textLabel,
  textPlaceholder,
  onUpdate,
  onRemove,
}: ItemRowProps) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
          #{index + 1}
        </span>
        {canEdit && canRemove && (
          <Button
            aria-label={`Hapus baris ${String(index + 1)}`}
            className="-mt-1 -mr-1 text-muted-foreground hover:text-destructive"
            onClick={() => {
              onRemove(index)
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <IconTrash className="size-4" />
          </Button>
        )}
      </div>
      <Field>
        <FieldLabel className="text-xs" htmlFor={`${idPrefix}-${String(index)}-text`}>
          {textLabel}
        </FieldLabel>
        <Input
          className="h-10"
          disabled={!canEdit}
          id={`${idPrefix}-${String(index)}-text`}
          onChange={(event) => {
            onUpdate(index, "text", event.target.value)
          }}
          placeholder={textPlaceholder}
          value={item.text}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel className="text-xs" htmlFor={`${idPrefix}-${String(index)}-responsible`}>
            Penanggung Jawab
          </FieldLabel>
          <Input
            className="h-10"
            disabled={!canEdit}
            id={`${idPrefix}-${String(index)}-responsible`}
            onChange={(event) => {
              onUpdate(index, "responsible", event.target.value)
            }}
            placeholder="Nama / jabatan"
            value={item.responsible}
          />
        </Field>
        <Field>
          <FieldLabel className="text-xs" htmlFor={`${idPrefix}-${String(index)}-date`}>
            Target Tanggal
          </FieldLabel>
          <Input
            className="h-10"
            disabled={!canEdit}
            id={`${idPrefix}-${String(index)}-date`}
            onChange={(event) => {
              onUpdate(index, "target_date", event.target.value)
            }}
            type="date"
            value={item.target_date}
          />
        </Field>
      </div>
    </li>
  )
}

export function InvestigationWorksheet({
  investigation,
  canEdit,
  onSave,
  onComplete,
}: InvestigationWorksheetProps) {
  const initialRecs = parseRecommendations(investigation?.recommendations)
  const initialActions = parseActions(investigation?.actions)

  const [directCause, setDirectCause] = useState(investigation?.direct_cause ?? "")
  const [rootCause, setRootCause] = useState(investigation?.underlying_root_cause ?? "")
  const [startDate, setStartDate] = useState(investigation?.investigation_start_date ?? "")
  const [endDate, setEndDate] = useState(investigation?.investigation_end_date ?? "")
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(
    initialRecs.length > 0 ? initialRecs : [{ text: "", responsible: "", target_date: "" }],
  )
  const [actions, setActions] = useState<ActionItem[]>(
    initialActions.length > 0 ? initialActions : [{ text: "", responsible: "", target_date: "" }],
  )

  const [isSaving, setIsSaving] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleAddRecommendation = () => {
    setRecommendations([...recommendations, { text: "", responsible: "", target_date: "" }])
  }

  const handleRemoveRecommendation = (index: number) => {
    if (recommendations.length > 1) {
      setRecommendations(recommendations.filter((_, i) => i !== index))
    }
  }

  const handleUpdateRecommendation = (
    index: number,
    field: keyof RecommendationItem,
    value: string,
  ) => {
    const updated = [...recommendations]
    const item = updated[index]
    if (item) {
      item[field] = value
      setRecommendations(updated)
    }
  }

  const handleAddAction = () => {
    setActions([...actions, { text: "", responsible: "", target_date: "" }])
  }

  const handleRemoveAction = (index: number) => {
    if (actions.length > 1) {
      setActions(actions.filter((_, i) => i !== index))
    }
  }

  const handleUpdateAction = (index: number, field: keyof ActionItem, value: string) => {
    const updated = [...actions]
    const item = updated[index]
    if (item) {
      item[field] = value
      setActions(updated)
    }
  }

  const handleSaveDraft = async () => {
    setErrorMessage(null)
    setFeedbackMessage(null)
    setIsSaving(true)
    try {
      await onSave({
        direct_cause: directCause,
        underlying_root_cause: rootCause,
        investigation_start_date: startDate,
        investigation_end_date: endDate,
        recommendations,
        actions,
      })
      setFeedbackMessage("Draf investigasi sederhana berhasil disimpan.")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal menyimpan investigasi.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCompleteSubmit = async (e: SyntheticEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setFeedbackMessage(null)

    if (startDate && endDate && endDate < startDate) {
      setErrorMessage("Tanggal selesai investigasi tidak boleh mendahului tanggal mulai.")
      return
    }

    setIsCompleting(true)
    try {
      // First save latest values
      await onSave({
        direct_cause: directCause,
        underlying_root_cause: rootCause,
        investigation_start_date: startDate,
        investigation_end_date: endDate,
        recommendations,
        actions,
      })
      // Then trigger completion
      await onComplete()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal menyelesaikan investigasi.")
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <section
      aria-labelledby="section-investigation-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
        <div>
          <h2
            className="text-sm font-semibold text-foreground sm:text-base"
            id="section-investigation-title"
          >
            Lembar Kerja Investigasi Sederhana
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Investigasi insiden pita Biru/Hijau oleh Kepala Ruangan IBS.
          </p>
        </div>
        {investigation?.completed_at && (
          <span className="rounded-full bg-status-success px-3 py-1 text-xs font-semibold text-status-success-foreground">
            Selesai · {new Date(investigation.completed_at).toLocaleString("id-ID")}
          </span>
        )}
      </header>

      {feedbackMessage && (
        <p
          className="rounded-lg bg-status-success px-3 py-2.5 text-xs font-medium text-status-success-foreground"
          role="status"
        >
          {feedbackMessage}
        </p>
      )}

      {errorMessage && (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          void handleCompleteSubmit(e)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="direct_cause">
              Penyebab Langsung (Direct Cause){" "}
              <span aria-hidden="true" className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              className="min-h-16"
              disabled={!canEdit}
              id="direct_cause"
              onChange={(e) => {
                setDirectCause(e.target.value)
              }}
              placeholder="Jelaskan faktor langsung yang memicu terjadinya insiden di kamar operasi…"
              rows={2}
              value={directCause}
            />
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="underlying_root_cause">
              Akar Masalah (Root Cause){" "}
              <span aria-hidden="true" className="text-destructive">*</span>
            </FieldLabel>
            <Textarea
              className="min-h-16"
              disabled={!canEdit}
              id="underlying_root_cause"
              onChange={(e) => {
                setRootCause(e.target.value)
              }}
              placeholder="Jelaskan akar penyebab sistemik atau kegagalan proses yang mendasari insiden…"
              rows={2}
              value={rootCause}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="investigation_start_date">
              Tanggal Mulai Investigasi{" "}
              <span aria-hidden="true" className="text-destructive">*</span>
            </FieldLabel>
            <Input
              className="h-10"
              disabled={!canEdit}
              id="investigation_start_date"
              onChange={(e) => {
                setStartDate(e.target.value)
              }}
              type="date"
              value={startDate}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="investigation_end_date">
              Tanggal Selesai Investigasi{" "}
              <span aria-hidden="true" className="text-destructive">*</span>
            </FieldLabel>
            <Input
              className="h-10"
              disabled={!canEdit}
              id="investigation_end_date"
              onChange={(e) => {
                setEndDate(e.target.value)
              }}
              type="date"
              value={endDate}
            />
            {startDate && endDate && endDate < startDate && (
              <FieldDescription className="text-destructive">
                Tanggal selesai mendahului tanggal mulai.
              </FieldDescription>
            )}
          </Field>
        </div>

        {/* Rekomendasi Pencegahan */}
        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Rekomendasi Pencegahan{" "}
                <span aria-hidden="true" className="text-destructive">*</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Minimal satu rekomendasi lengkap wajib diisi.
              </p>
            </div>
            {canEdit && (
              <Button onClick={handleAddRecommendation} size="sm" type="button" variant="outline">
                <IconPlus data-icon="inline-start" />
                Tambah
              </Button>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {recommendations.map((rec, index) => (
              <ItemRow
                canEdit={canEdit}
                canRemove={recommendations.length > 1}
                idPrefix="rekomendasi"
                index={index}
                item={rec}
                key={index}
                onRemove={handleRemoveRecommendation}
                onUpdate={handleUpdateRecommendation}
                textLabel="Rekomendasi"
                textPlaceholder="Rekomendasi tindakan pencegahan"
              />
            ))}
          </ul>
        </div>

        {/* Tindakan Perbaikan */}
        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tindakan Perbaikan{" "}
                <span aria-hidden="true" className="text-destructive">*</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Minimal satu tindakan perbaikan lengkap wajib diisi.
              </p>
            </div>
            {canEdit && (
              <Button onClick={handleAddAction} size="sm" type="button" variant="outline">
                <IconPlus data-icon="inline-start" />
                Tambah
              </Button>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {actions.map((act, index) => (
              <ItemRow
                canEdit={canEdit}
                canRemove={actions.length > 1}
                idPrefix="tindakan"
                index={index}
                item={act}
                key={index}
                onRemove={handleRemoveAction}
                onUpdate={handleUpdateAction}
                textLabel="Tindakan korektif"
                textPlaceholder="Tindakan korektif yang akan dilakukan"
              />
            ))}
          </ul>
        </div>

        {canEdit && (
          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
            <Button
              disabled={isSaving || isCompleting}
              onClick={() => {
                void handleSaveDraft()
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {isSaving ? <Spinner data-icon="inline-start" /> : <IconDeviceFloppy data-icon="inline-start" />}
              {isSaving ? "Menyimpan…" : "Simpan Draf"}
            </Button>

            <Button className="font-medium" disabled={isSaving || isCompleting} size="sm" type="submit">
              {isCompleting ? <Spinner data-icon="inline-start" /> : <IconCheck data-icon="inline-start" />}
              {isCompleting ? "Menyelesaikan…" : "Selesaikan Investigasi"}
            </Button>
          </div>
        )}
      </form>
    </section>
  )
}
