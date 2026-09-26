import type { UseFormRegister, FieldErrors, UseFormWatch } from "react-hook-form"
import type { IncidentFormData } from "../schemas/incident-form-schema"

interface FormSectionImmediateActionProps {
  register: UseFormRegister<IncidentFormData>
  errors: FieldErrors<IncidentFormData>
  watch: UseFormWatch<IncidentFormData>
  isOverdue?: boolean
  disabled?: boolean
}

const ACTION_PERFORMERS = [
  "Dokter Operator / DPJP",
  "Dokter Anestesi",
  "Perawat Bedah (Instrumen / Sirkuler)",
  "Penata Anestesi",
  "Petugas Lainnya",
  "Tim Bedah",
]

export function FormSectionImmediateAction({
  register,
  errors,
  watch,
  isOverdue = false,
  disabled = false,
}: FormSectionImmediateActionProps) {
  const similarOccurred = watch("similar_incident_occurred")

  return (
    <section
      aria-labelledby="section-action-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs"
    >
      <div className="border-b pb-3">
        <h2 className="text-base font-semibold text-foreground" id="section-action-title">
          Tindakan Segera &amp; Riwayat Serupa
        </h2>
        <p className="text-xs text-muted-foreground">
          Upaya stabilisasi awal pasca-insiden dan evaluasi keberulangan kejadian.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label
            className="text-xs font-medium text-foreground"
            htmlFor="immediate_action_and_result"
          >
            Tindakan yang Segera Dilakukan &amp; Hasilnya{" "}
            <span className="text-destructive">*</span>
          </label>
          <textarea
            {...register("immediate_action_and_result")}
            className="min-h-20 w-full rounded-lg border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="immediate_action_and_result"
            placeholder="Jelaskan tindakan darurat klinis yang diambil untuk menolong pasien/korban dan hasil evaluasi klinis sesaat setelah tindakan..."
            rows={3}
          />
          {errors.immediate_action_and_result && (
            <p className="text-xs text-destructive">{errors.immediate_action_and_result.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="action_taken_by">
            Tindakan Dilakukan Oleh <span className="text-destructive">*</span>
          </label>
          <select
            {...register("action_taken_by")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="action_taken_by"
          >
            <option value="">-- Pilih Pelaku Tindakan --</option>
            {ACTION_PERFORMERS.map((actor) => (
              <option key={actor} value={actor}>
                {actor}
              </option>
            ))}
          </select>
          {errors.action_taken_by && (
            <p className="text-xs text-destructive">{errors.action_taken_by.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-medium text-foreground"
            htmlFor="similar_incident_occurred"
          >
            Apakah Kejadian Serupa Pernah Terjadi? <span className="text-destructive">*</span>
          </label>
          <select
            {...register("similar_incident_occurred")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="similar_incident_occurred"
          >
            <option value="">-- Pilih Riwayat --</option>
            <option value="YA">Ya, Pernah Terjadi</option>
            <option value="TIDAK">Tidak Pernah Terjadi</option>
            <option value="TIDAK_TAHU">Tidak Tahu</option>
          </select>
          {errors.similar_incident_occurred && (
            <p className="text-xs text-destructive">{errors.similar_incident_occurred.message}</p>
          )}
        </div>

        {similarOccurred === "YA" && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="similar_incident_details"
            >
              Kapan Kejadian Serupa Terjadi &amp; Tindakan Pencegahannya{" "}
              <span className="text-destructive">*</span>
            </label>
            <textarea
              {...register("similar_incident_details")}
              className="min-h-16 w-full rounded-lg border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={disabled}
              id="similar_incident_details"
              placeholder="Jelaskan perkiraan waktu kejadian sebelumnya dan langkah pencegahan yang pernah ditetapkan..."
              rows={2}
            />
            {errors.similar_incident_details && (
              <p className="text-xs text-destructive">{errors.similar_incident_details.message}</p>
            )}
          </div>
        )}

        {isOverdue && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-destructive" htmlFor="overdue_reason">
                Alasan Keterlambatan Pelaporan (&gt; 48 Jam){" "}
                <span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] font-medium text-destructive">
                Wajib diisi karena melewati batas SLA
              </span>
            </div>
            <textarea
              {...register("overdue_reason")}
              className="min-h-16 w-full rounded-lg border border-destructive/30 bg-background p-3 text-sm focus:border-destructive focus:outline-none focus:ring-2 focus:ring-destructive/20 disabled:opacity-50"
              disabled={disabled}
              id="overdue_reason"
              placeholder="Jelaskan kendala atau alasan mengapa pelaporan insiden ini melewati batas waktu 2x24 jam..."
              rows={2}
            />
            {errors.overdue_reason && (
              <p className="text-xs text-destructive">{errors.overdue_reason.message}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
