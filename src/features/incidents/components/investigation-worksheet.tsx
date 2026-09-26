import { useState, type SyntheticEvent } from "react"
import { IconCheck, IconDeviceFloppy, IconPlus, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
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
      className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-xs"
    >
      <div className="border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              className="text-lg font-bold tracking-tight text-foreground"
              id="section-investigation-title"
            >
              Bagian III: Lembar Kerja Investigasi Sederhana
            </h2>
            <p className="text-xs text-muted-foreground">
              Formulir investigasi insiden keselamatan pasien pita BIRU / HIJAU oleh Kepala Ruangan
              IBS.
            </p>
          </div>
          {investigation?.completed_at && (
            <div className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Selesai pada: {new Date(investigation.completed_at).toLocaleString("id-ID")}
            </div>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div className="rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {feedbackMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
          {errorMessage}
        </div>
      )}

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          void handleCompleteSubmit(e)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-foreground" htmlFor="direct_cause">
              Penyebab Langsung Insiden (Direct Cause) <span className="text-destructive">*</span>
            </label>
            <textarea
              className="min-h-16 w-full rounded-lg border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={!canEdit}
              id="direct_cause"
              onChange={(e) => {
                setDirectCause(e.target.value)
              }}
              placeholder="Jelaskan faktor langsung yang memicu terjadinya insiden di kamar operasi..."
              rows={2}
              value={directCause}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-foreground" htmlFor="underlying_root_cause">
              Akar Masalah (Underlying / Root Cause) <span className="text-destructive">*</span>
            </label>
            <textarea
              className="min-h-16 w-full rounded-lg border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={!canEdit}
              id="underlying_root_cause"
              onChange={(e) => {
                setRootCause(e.target.value)
              }}
              placeholder="Jelaskan akar penyebab sistemik atau kegagalan proses yang mendasari insiden..."
              rows={2}
              value={rootCause}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="investigation_start_date"
            >
              Tanggal Mulai Investigasi <span className="text-destructive">*</span>
            </label>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={!canEdit}
              id="investigation_start_date"
              onChange={(e) => {
                setStartDate(e.target.value)
              }}
              type="date"
              value={startDate}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="investigation_end_date">
              Tanggal Selesai Investigasi <span className="text-destructive">*</span>
            </label>
            <input
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={!canEdit}
              id="investigation_end_date"
              onChange={(e) => {
                setEndDate(e.target.value)
              }}
              type="date"
              value={endDate}
            />
          </div>
        </div>

        {/* Tabel Rekomendasi */}
        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tabel Rekomendasi Pencegahan <span className="text-destructive">*</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Minimal 1 rekomendasi lengkap wajib diisi.
              </p>
            </div>
            {canEdit && (
              <Button
                className="gap-1 text-xs"
                onClick={handleAddRecommendation}
                size="sm"
                type="button"
                variant="outline"
              >
                <IconPlus className="size-3.5" />
                <span>Tambah Rekomendasi</span>
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {recommendations.map((rec, index) => (
              <div
                className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center"
                key={index}
              >
                <input
                  className="flex-1 rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                  disabled={!canEdit}
                  onChange={(e) => {
                    handleUpdateRecommendation(index, "text", e.target.value)
                  }}
                  placeholder="Rekomendasi tindakan pencegahan"
                  value={rec.text}
                />
                <input
                  className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none sm:w-48"
                  disabled={!canEdit}
                  onChange={(e) => {
                    handleUpdateRecommendation(index, "responsible", e.target.value)
                  }}
                  placeholder="Penanggung Jawab"
                  value={rec.responsible}
                />
                <input
                  className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none sm:w-36"
                  disabled={!canEdit}
                  onChange={(e) => {
                    handleUpdateRecommendation(index, "target_date", e.target.value)
                  }}
                  type="date"
                  value={rec.target_date}
                />
                {canEdit && recommendations.length > 1 && (
                  <Button
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      handleRemoveRecommendation(index)
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <IconTrash className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tabel Tindakan Perbaikan */}
        <div className="flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tabel Tindakan Perbaikan (Action Plan) <span className="text-destructive">*</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Minimal 1 tindakan perbaikan lengkap wajib diisi.
              </p>
            </div>
            {canEdit && (
              <Button
                className="gap-1 text-xs"
                onClick={handleAddAction}
                size="sm"
                type="button"
                variant="outline"
              >
                <IconPlus className="size-3.5" />
                <span>Tambah Tindakan</span>
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {actions.map((act, index) => (
              <div
                className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center"
                key={index}
              >
                <input
                  className="flex-1 rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                  disabled={!canEdit}
                  onChange={(e) => {
                    handleUpdateAction(index, "text", e.target.value)
                  }}
                  placeholder="Tindakan korektif yang akan dilakukan"
                  value={act.text}
                />
                <input
                  className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none sm:w-48"
                  disabled={!canEdit}
                  onChange={(e) => {
                    handleUpdateAction(index, "responsible", e.target.value)
                  }}
                  placeholder="Penanggung Jawab"
                  value={act.responsible}
                />
                <input
                  className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none sm:w-36"
                  disabled={!canEdit}
                  onChange={(e) => {
                    handleUpdateAction(index, "target_date", e.target.value)
                  }}
                  type="date"
                  value={act.target_date}
                />
                {canEdit && actions.length > 1 && (
                  <Button
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      handleRemoveAction(index)
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <IconTrash className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
            <Button
              className="gap-1.5 font-medium"
              disabled={isSaving || isCompleting}
              onClick={() => {
                void handleSaveDraft()
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <IconDeviceFloppy className="size-4" />
              <span>{isSaving ? "Menyimpan..." : "Simpan Draf Investigasi"}</span>
            </Button>

            <Button
              className="gap-1.5 font-medium"
              disabled={isSaving || isCompleting}
              size="sm"
              type="submit"
              variant="default"
            >
              <IconCheck className="size-4" />
              <span>
                {isCompleting
                  ? "Menyelesaikan..."
                  : "Selesaikan Investigasi & Tutup di Tingkat Unit"}
              </span>
            </Button>
          </div>
        )}
      </form>
    </section>
  )
}
