import { useEffect, useRef, useState, type SyntheticEvent } from "react"
import { useForm } from "react-hook-form"
import {
  IconAlertTriangle,
  IconDeviceFloppy,
  IconSend,
  IconTrash,
} from "@tabler/icons-react"
import { useNavigate, useParams } from "react-router"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ErrorState } from "@/components/shared/error-state"
import { InlineLoader } from "@/components/shared/loading-states"
import { PageHeader } from "@/components/shared/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/use-auth"
import {
  createDraft,
  deleteIncident,
  fetchIncidentById,
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

function toDateTimeLocal(value: string | null): string {
  if (!value) return ""
  return value.length >= 16 ? value.slice(0, 16) : value
}

function reportToFormData(report: IncidentReport): IncidentFormData {
  return {
    reporter_name: report.reporter_name,
    reporter_role: report.reporter_role,
    patient_name: report.patient_name ?? "",
    medical_record_number: report.medical_record_number ?? "",
    patient_room: report.patient_room ?? "",
    patient_age_category: report.patient_age_category ?? "",
    patient_gender: report.patient_gender ?? "LAKI_LAKI",
    patient_payer_type: report.patient_payer_type ?? "",
    admission_datetime: toDateTimeLocal(report.admission_datetime),
    incident_datetime: toDateTimeLocal(report.incident_datetime),
    incident_timezone: report.incident_timezone || "Asia/Makassar",
    incident_title: report.incident_title ?? "",
    chronology: report.chronology ?? "",
    incident_type: report.incident_type,
    initial_reporter_category: report.initial_reporter_category ?? "",
    initial_reporter_detail: report.initial_reporter_detail ?? "",
    incident_target: report.incident_target,
    incident_target_other: report.incident_target_other ?? "",
    patient_care_type: report.patient_care_type ?? "",
    incident_location: report.incident_location ?? "",
    clinical_specialization: report.clinical_specialization ?? "",
    causing_unit: report.causing_unit ?? "",
    patient_impact: report.patient_impact ?? "",
    immediate_action_and_result: report.immediate_action_and_result ?? "",
    action_taken_by: report.action_taken_by ?? "",
    similar_incident_occurred: report.similar_incident_occurred ?? "TIDAK",
    similar_incident_details: report.similar_incident_details ?? "",
    overdue_reason: report.overdue_reason ?? "",
  }
}

export function IncidentCreatePage() {
  const { user, csrfToken } = useAuth()
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id: string }>()
  const isEditMode = Boolean(editId)

  const [masterData, setMasterData] = useState<MasterDataPayload | null>(null)
  const [createdReport, setCreatedReport] = useState<IncidentReport | null>(null)
  const [isInitializing, setIsInitializing] = useState(isEditMode)
  const [initializationError, setInitializationError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)
  const [validationSummary, setValidationSummary] = useState<string[] | null>(null)

  // Current row version and serialized save queue for optimistic concurrency.
  const reportRef = useRef<IncidentReport | null>(null)
  const rowVersionRef = useRef(1)
  const saveQueueRef = useRef<Promise<IncidentReport | null>>(Promise.resolve(null))
  const pendingSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializingRef = useRef(isEditMode)

  const {
    register,
    watch,
    getValues,
    reset,
    setValue,
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

  // Load master data and, in edit mode, hydrate the existing draft/revision.
  useEffect(() => {
    let isMounted = true

    void fetchMasterData()
      .then((data) => {
        if (isMounted) setMasterData(data)
      })
      .catch(() => {})

    if (!editId) {
      initializingRef.current = false
      setIsInitializing(false)
      return () => {
        isMounted = false
      }
    }

    initializingRef.current = true
    setIsInitializing(true)
    setInitializationError(null)
    void fetchIncidentById(editId)
      .then((report) => {
        if (!isMounted) return
        if (report.status !== "DRAFT" && report.status !== "REVISION_REQUIRED") {
          throw new Error("Laporan ini tidak lagi dapat diedit.")
        }
        reportRef.current = report
        rowVersionRef.current = report.row_version
        setCreatedReport(report)
        reset(reportToFormData(report))
        setSaveStatus("saved")
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setInitializationError(
          err instanceof Error ? err.message : "Gagal memuat laporan yang akan diperbaiki.",
        )
      })
      .finally(() => {
        if (!isMounted) return
        initializingRef.current = false
        setIsInitializing(false)
      })

    return () => {
      isMounted = false
    }
  }, [editId, reset])

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

  // Core save routine. Every call appends one write to a shared promise chain,
  // so optimistic row versions remain ordered and final submission can flush it.
  const triggerSave = async (): Promise<IncidentReport | null> => {
    const saveOperation = async (): Promise<IncidentReport | null> => {
      const values = getValues()

      // Minimum draft check: reporter_name, reporter_role, incident_datetime, incident_type
      if (
        !values.reporter_name.trim() ||
        !values.reporter_role.trim() ||
        !values.incident_datetime.trim()
      ) {
        setSaveStatus("unsaved")
        return reportRef.current
      }

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
        const currentReport = reportRef.current
        const persistedReport = currentReport
          ? await saveDraft(
              currentReport.id,
              payload,
              rowVersionRef.current,
              csrfToken ?? undefined,
            )
          : await createDraft(payload, csrfToken ?? undefined)

        reportRef.current = persistedReport
        rowVersionRef.current = persistedReport.row_version
        setCreatedReport(persistedReport)
        setSaveStatus("saved")
        setLastSavedAt(new Date())
        return persistedReport
      } catch (err) {
        setSaveStatus("error")
        setSaveErrorMessage(err instanceof Error ? err.message : "Gagal menyimpan draf.")
        return null
      }
    }

    saveQueueRef.current = saveQueueRef.current.then(saveOperation, saveOperation)
    return saveQueueRef.current
  }

  const triggerSaveRef = useRef(triggerSave)
  triggerSaveRef.current = triggerSave

  // Auto-save on field changes via watch subscription
  useEffect(() => {
    const subscription = watch(() => {
      if (initializingRef.current) return
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
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current)
      }
    }
  }, [watch])

  // Draft deletion (confirmed via ConfirmDialog)
  const handleDeleteDraft = async () => {
    const currentReport = reportRef.current
    if (!currentReport) {
      void navigate("/laporan")
      return
    }

    setIsDeleting(true)
    setDeleteErrorMessage(null)
    try {
      await deleteIncident(currentReport.id, csrfToken ?? undefined)
      void navigate("/laporan")
    } catch (err) {
      setShowDeleteConfirm(false)
      setDeleteErrorMessage(err instanceof Error ? err.message : "Gagal menghapus draf.")
    } finally {
      setIsDeleting(false)
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
        messages.push(issue.message)
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
      // 1. Cancel delayed work and flush the latest values to the server.
      if (pendingSaveTimerRef.current) {
        clearTimeout(pendingSaveTimerRef.current)
        pendingSaveTimerRef.current = null
      }
      const persistedReport = await triggerSave()

      if (!persistedReport) {
        throw new Error("Draf belum berhasil disimpan di server.")
      }

      // 2. Execute submit against the persisted draft/revision.
      const submitted = await submitIncident(persistedReport.id, csrfToken ?? undefined)

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

  if (isInitializing) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <InlineLoader label="Memuat laporan untuk diperbaiki…" />
      </div>
    )
  }

  if (initializationError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10 sm:px-6 lg:px-8">
        <ErrorState
          message={initializationError}
          onRetry={() => {
            window.location.reload()
          }}
          title="Laporan tidak dapat diedit"
        />
        <Button onClick={() => void navigate("/laporan")} size="sm" variant="outline">
          Kembali ke Daftar Laporan
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        breadcrumbs={[
          { label: "Beranda", to: "/" },
          { label: "Laporan Insiden", to: "/laporan" },
          {
            label: isEditMode
              ? createdReport?.report_number ?? "Perbaikan Laporan"
              : "Laporan Baru",
          },
        ]}
        description={
          isEditMode
            ? "Perbaiki data sesuai arahan Kepala Ruangan. Perubahan tersimpan otomatis pada laporan yang sama."
            : "Isi data berikut sedetail mungkin. Draf tersimpan otomatis dan dapat dilanjutkan kapan saja sebelum dikirim resmi."
        }
        title={
          isEditMode
            ? "Perbaiki Laporan Insiden Keselamatan Pasien"
            : "Formulir Pelaporan Insiden Keselamatan Pasien"
        }
      >
        <div className="flex items-center">
          <AutoSaveIndicator
            errorMessage={saveErrorMessage}
            lastSavedAt={lastSavedAt}
            onRetry={() => {
              void triggerSave()
            }}
            status={saveStatus}
          />
        </div>
      </PageHeader>

      {/* Validation Summary if submit rejected */}
      {validationSummary && validationSummary.length > 0 && (
        <Alert
          aria-live="polite"
          className="border-destructive/30 bg-destructive/5"
          role="alert"
          variant="destructive"
        >
          <IconAlertTriangle />
          <AlertTitle className="text-destructive">
            Formulir belum lengkap ({validationSummary.length})
          </AlertTitle>
          <AlertDescription>
            Perbaiki isian berikut, lalu coba kirim ulang:
            <ul className="mt-1.5 list-disc pl-4 leading-5">
              {validationSummary.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {deleteErrorMessage && (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert" variant="destructive">
          <IconAlertTriangle />
          <AlertDescription className="text-destructive">{deleteErrorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Main Form */}
      <form className="flex flex-col gap-5 pb-20" onSubmit={onAttemptSubmit}>
        <FormSectionPatient errors={errors} masterData={masterData} register={register} setValue={setValue} watch={watch} />

        <FormSectionIncident
          errors={errors}
          masterData={masterData}
          register={register}
          setValue={setValue}
          watch={watch}
        />

        <FormSectionImmediateAction
          errors={errors}
          register={register}
          watch={watch}
        />

        {/* Sticky Action Bar */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="hidden sm:block">
              <AutoSaveIndicator
                className="text-[11px]"
                lastSavedAt={lastSavedAt}
                status={saveStatus}
              />
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              {createdReport?.status === "DRAFT" && (
                <Button
                  className="mr-auto text-muted-foreground hover:text-destructive sm:mr-0"
                  onClick={() => { setShowDeleteConfirm(true); }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <IconTrash data-icon="inline-start" />
                  <span className="hidden sm:inline">Hapus Draf</span>
                </Button>
              )}
              <Button
                disabled={saveStatus === "saving" || isSubmitting}
                onClick={() => {
                  void triggerSave()
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <IconDeviceFloppy data-icon="inline-start" />
                Simpan Draf
              </Button>
            <Button className="font-medium" disabled={isSubmitting} size="sm" type="submit">
              <IconSend data-icon="inline-start" />
              {isEditMode ? "Kirim Ulang" : "Kirim Laporan"}
            </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Delete draft confirmation */}
      {createdReport?.status === "DRAFT" && (
        <ConfirmDialog
          busy={isDeleting}
          cancelLabel="Batal"
          confirmLabel="Hapus Draf"
          description="Draf akan dihapus secara permanen dan tidak dapat dipulihkan."
          onConfirm={() => {
            void handleDeleteDraft()
          }}
          onOpenChange={setShowDeleteConfirm}
          open={showDeleteConfirm}
          title="Hapus draf laporan ini?"
          tone="destructive"
        />
      )}

      {/* Final Submission Confirmation Modal */}
      <Dialog onOpenChange={setShowSubmitModal} open={showSubmitModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="pr-10">
            <DialogTitle className="flex items-center gap-2">
              <IconSend aria-hidden="true" className="size-4 text-primary" />
              Konfirmasi Pengiriman Laporan Resmi
            </DialogTitle>
            <DialogDescription>
              Pastikan data laporan sudah benar dan lengkap. Setelah dikirim, laporan berstatus{" "}
              <strong className="font-semibold text-foreground">Terkirim</strong>, data klinis
              dikunci, dan diteruskan ke Kepala Ruangan IBS untuk verifikasi.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-5">
            <span className="font-semibold text-foreground">Pernyataan Pelapor:</span>
            <p className="mt-1 text-muted-foreground">
              Saya menyatakan bahwa informasi dalam laporan ini dibuat dengan sebenar-benarnya demi
              peningkatan mutu dan keselamatan pasien.
            </p>
          </div>

          {saveErrorMessage && (
            <p className="text-xs font-medium text-destructive" role="alert">
              {saveErrorMessage}
            </p>
          )}

          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => {
                setShowSubmitModal(false)
              }}
              type="button"
              variant="ghost"
            >
              Periksa Kembali
            </Button>
            <Button
              className="font-medium"
              disabled={isSubmitting}
              onClick={() => {
                void executeFinalSubmit()
              }}
              type="button"
            >
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {isSubmitting
                ? "Mengirim…"
                : isEditMode
                  ? "Ya, Kirim Ulang"
                  : "Ya, Kirim Laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
