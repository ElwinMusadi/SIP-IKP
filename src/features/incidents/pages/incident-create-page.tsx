import { useEffect, useRef, useState, type SyntheticEvent } from "react"
import { useForm } from "react-hook-form"
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconDeviceFloppy,
  IconSend,
  IconTrash,
} from "@tabler/icons-react"
import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/use-auth"
import {
  createDraft,
  deleteDraft,
  fetchMasterData,
  saveDraft,
  submitIncident,
} from "../api/incidents-api"
import { AutoSaveIndicator, type SaveStatus } from "../components/auto-save-indicator"
import { FormSectionImmediateAction } from "../components/form-section-immediate-action"
import { FormSectionIncident } from "../components/form-section-incident"
import { FormSectionPatient } from "../components/form-section-patient"
import { incidentFormSchema, type IncidentFormData } from "../schemas/incident-form-schema"
import type { IncidentReport, MasterDataPayload } from "../types/incident"

export function IncidentCreatePage() {
  const { user, csrfToken } = useAuth()
  const navigate = useNavigate()

  const [masterData, setMasterData] = useState<MasterDataPayload | null>(null)
  const [createdReport, setCreatedReport] = useState<IncidentReport | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [validationSummary, setValidationSummary] = useState<string[] | null>(null)

  // Current row version for optimistic concurrency
  const rowVersionRef = useRef(1)
  const isSavingRef = useRef(false)
  const pendingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    watch,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<IncidentFormData>({
    defaultValues: {
      reporter_name: user?.fullName ?? "",
      reporter_role: user?.profession ?? "Perawat Bedah",
      incident_timezone: "Asia/Makassar",
      incident_type: "KNC",
      incident_target: "PASIEN",
      patient_gender: "LAKI_LAKI",
      similar_incident_occurred: "TIDAK",
    },
    mode: "onChange",
  })

  // Load master data on mount
  useEffect(() => {
    void fetchMasterData()
      .then(setMasterData)
      .catch(() => {})
  }, [])

  // Warn before leaving if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved" || saveStatus === "saving") {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [saveStatus])

  // Core save routine
  const triggerSave = async () => {
    const values = getValues()

    // Minimum draft check: reporter_name, reporter_role, incident_datetime, incident_type
    if (
      !values.reporter_name.trim() ||
      !values.reporter_role.trim() ||
      !values.incident_datetime.trim()
    ) {
      setSaveStatus("unsaved")
      return
    }

    if (isSavingRef.current) {
      return
    }

    isSavingRef.current = true
    setSaveStatus("saving")
    setSaveErrorMessage(null)

    const payload: Partial<IncidentReport> = {
      reporter_name: values.reporter_name,
      reporter_role: values.reporter_role,
      patient_name: values.patient_name || null,
      medical_record_number: values.medical_record_number || null,
      patient_room: values.patient_room || null,
      patient_age_category: values.patient_age_category || null,
      patient_gender: values.patient_gender,
      patient_payer_type: values.patient_payer_type || null,
      admission_datetime: values.admission_datetime || null,
      incident_datetime: values.incident_datetime,
      incident_timezone: values.incident_timezone,
      incident_title: values.incident_title || null,
      chronology: values.chronology || null,
      incident_type: values.incident_type,
      initial_reporter_category: values.initial_reporter_category || null,
      initial_reporter_detail: values.initial_reporter_detail || null,
      incident_target: values.incident_target,
      incident_target_other: values.incident_target_other || null,
      patient_care_type: values.patient_care_type || null,
      incident_location: values.incident_location || null,
      clinical_specialization: values.clinical_specialization || null,
      causing_unit: values.causing_unit || null,
      patient_impact: values.patient_impact || null,
      immediate_action_and_result: values.immediate_action_and_result || null,
      action_taken_by: values.action_taken_by || null,
      similar_incident_occurred: values.similar_incident_occurred || null,
      similar_incident_details: values.similar_incident_details || null,
      overdue_reason: values.overdue_reason || null,
    }

    try {
      if (!createdReport) {
        // First persistent draft creation
        const newReport = await createDraft(payload, csrfToken ?? undefined)
        setCreatedReport(newReport)
        rowVersionRef.current = newReport.row_version
      } else {
        // Update existing draft
        const updated = await saveDraft(
          createdReport.id,
          payload,
          rowVersionRef.current,
          csrfToken ?? undefined,
        )
        rowVersionRef.current = updated.row_version
      }

      setSaveStatus("saved")
      setLastSavedAt(new Date())
    } catch (err) {
      setSaveStatus("error")
      setSaveErrorMessage(err instanceof Error ? err.message : "Gagal menyimpan draf.")
    } finally {
      isSavingRef.current = false
    }
  }

  const triggerSaveRef = useRef(triggerSave)
  triggerSaveRef.current = triggerSave

  // Auto-save on field changes via watch subscription
  useEffect(() => {
    const subscription = watch(() => {
      setSaveStatus("unsaved")
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current)
      }
      pendingSaveTimerRef.current = setTimeout(() => {
        void triggerSaveRef.current()
      }, 500)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [watch])

  // Draft deletion
  const handleDeleteDraft = async () => {
    if (!createdReport) {
      void navigate("/laporan")
      return
    }

    if (
      !window.confirm(
        "Apakah Anda yakin ingin menghapus draf ini? Draf akan dihapus secara permanen dan tidak dapat dipulihkan.",
      )
    ) {
      return
    }

    try {
      await deleteDraft(createdReport.id, csrfToken ?? undefined)
      void navigate("/laporan")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus draf.")
    }
  }

  // Pre-submit validation
  const onAttemptSubmit = (e: SyntheticEvent) => {
    e.preventDefault()
    setValidationSummary(null)
    clearErrors()

    const values = getValues()
    const result = incidentFormSchema.safeParse(values)

    if (!result.success) {
      const messages: string[] = []
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof IncidentFormData
        setError(path, { message: issue.message })
        messages.push(`${path}: ${issue.message}`)
      }
      setValidationSummary(messages)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    // Form is 100% valid! Open confirmation modal
    setShowSubmitModal(true)
  }

  // Final submit execution
  const executeFinalSubmit = async () => {
    setIsSubmitting(true)
    setSaveErrorMessage(null)

    try {
      // 1. Ensure draft is saved first
      await triggerSave()

      if (!createdReport) {
        throw new Error("Draf belum berhasil disimpan di server.")
      }

      // 2. Execute submit
      const submitted = await submitIncident(createdReport.id, csrfToken ?? undefined)

      // 3. Redirect to report detail with confirmation
      void navigate(`/laporan/${submitted.id}`, {
        replace: true,
        state: { submitSuccess: true },
      })
    } catch (err) {
      setShowSubmitModal(false)
      setSaveErrorMessage(err instanceof Error ? err.message : "Gagal mengirimkan laporan resmi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // SLA Calculation preview
  const incidentDatetimeVal = watch("incident_datetime")
  let isOverduePreview = false
  if (incidentDatetimeVal && !Number.isNaN(Date.parse(incidentDatetimeVal))) {
    const deadlineMs = new Date(incidentDatetimeVal).getTime() + 48 * 60 * 60 * 1000
    isOverduePreview = Date.now() > deadlineMs
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header & Auto-Save bar */}
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
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
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Formulir Pelaporan Insiden Keselamatan Pasien (IKP)
            </h1>
            <p className="text-xs text-muted-foreground">
              Instalasi Bedah Sentral &bull; RSUD Prof. Dr. W. Z. Johannes Kupang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <AutoSaveIndicator
            errorMessage={saveErrorMessage}
            lastSavedAt={lastSavedAt}
            onRetry={() => {
              void triggerSave()
            }}
            status={saveStatus}
          />
        </div>
      </div>

      {/* Validation Summary if submit rejected */}
      {validationSummary && validationSummary.length > 0 && (
        <div
          aria-live="polite"
          className="flex flex-col gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive"
          role="alert"
        >
          <div className="flex items-center gap-2 font-semibold">
            <IconAlertTriangle className="size-4 shrink-0" />
            <span>Formulir Belum Lengkap! Periksa field yang ditandai berikut:</span>
          </div>
          <ul className="list-disc pl-5 leading-5">
            {validationSummary.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Form */}
      <form className="flex flex-col gap-6" onSubmit={onAttemptSubmit}>
        <FormSectionPatient errors={errors} masterData={masterData} register={register} />

        <FormSectionIncident
          errors={errors}
          masterData={masterData}
          register={register}
          watch={watch}
        />

        <FormSectionImmediateAction
          errors={errors}
          isOverdue={isOverduePreview}
          register={register}
          watch={watch}
        />

        {/* Action Bar */}
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
          <div>
            {createdReport && (
              <Button
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => {
                  void handleDeleteDraft()
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                <IconTrash className="size-3.5" />
                <span>Hapus Draf Ini</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              className="gap-1.5 text-xs"
              disabled={saveStatus === "saving" || isSubmitting}
              onClick={() => {
                void triggerSave()
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <IconDeviceFloppy className="size-3.5" />
              <span>Simpan Draf</span>
            </Button>

            <Button
              className="gap-1.5 font-medium"
              disabled={isSubmitting}
              size="default"
              type="submit"
            >
              <IconSend className="size-4" />
              <span>Kirim Laporan Resmi</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Final Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-2.5 text-primary">
              <IconSend className="size-6" />
              <h3 className="text-base font-bold text-foreground">
                Konfirmasi Pengiriman Laporan Resmi
              </h3>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Apakah Anda yakin data laporan insiden keselamatan pasien ini sudah benar dan lengkap?
              Setelah dikirim, laporan akan berstatus <strong>SUBMITTED</strong>, data klinis akan
              dikunci permanen, dan diteruskan ke Kepala Ruangan IBS untuk verifikasi penerimaan.
            </p>

            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              <span className="font-semibold text-foreground">Pernyataan Pelapor:</span>
              <p className="mt-1 text-muted-foreground">
                Saya menyatakan bahwa informasi yang saya sampaikan dalam laporan ini dibuat dengan
                sebenar-benarnya demi peningkatan mutu dan keselamatan pasien.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                disabled={isSubmitting}
                onClick={() => {
                  setShowSubmitModal(false)
                }}
                size="sm"
                variant="ghost"
              >
                Batal &amp; Periksa Kembali
              </Button>
              <Button
                className="gap-1.5 font-medium"
                disabled={isSubmitting}
                onClick={() => {
                  void executeFinalSubmit()
                }}
                size="sm"
              >
                <IconCheck className="size-4" />
                <span>
                  {isSubmitting ? "Mengirimkan Laporan..." : "Ya, Kirimkan Laporan Resmi"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
