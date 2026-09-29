import type { FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form"

import { FormSection } from "@/components/shared/form-section"
import type { IncidentFormData } from "../schemas/incident-form-schema"
import { SelectField, TextAreaField } from "./form-controls"

interface FormSectionImmediateActionProps {
  register: UseFormRegister<IncidentFormData>
  errors: FieldErrors<IncidentFormData>
  watch: UseFormWatch<IncidentFormData>
  disabled?: boolean
}

const ACTION_PERFORMERS = [
  "Dokter Operator / DPJP",
  "Dokter Anestesi",
  "Perawat Bedah (Instrumen / Sirkuler)",
  "Penata Anestesi",
  "Petugas Lainnya",
  "Tim Bedah",
].map((value) => ({ value, label: value }))

const SIMILAR_HISTORY_OPTIONS = [
  { value: "YA", label: "Ya, pernah terjadi" },
  { value: "TIDAK", label: "Tidak pernah terjadi" },
  { value: "TIDAK_TAHU", label: "Tidak tahu" },
]

export function FormSectionImmediateAction({
  register,
  errors,
  watch,
  disabled = false,
}: FormSectionImmediateActionProps) {
  const similarOccurred = watch("similar_incident_occurred")

  return (
    <FormSection
      description="Upaya stabilisasi awal pasca-insiden dan evaluasi keberulangan kejadian."
      id="section-tindakan"
      step={3}
      title="Tindakan Segera & Riwayat Serupa"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextAreaField
          className="sm:col-span-2"
          disabled={disabled}
          error={errors.immediate_action_and_result?.message}
          label="Tindakan yang Segera Dilakukan & Hasilnya"
          name="immediate_action_and_result"
          placeholder="Jelaskan tindakan darurat klinis yang diambil untuk menolong pasien/korban dan hasil evaluasi sesaat setelah tindakan…"
          register={register}
          required
          rows={3}
        />
        <SelectField
          disabled={disabled}
          error={errors.action_taken_by?.message}
          label="Tindakan Dilakukan Oleh"
          name="action_taken_by"
          options={ACTION_PERFORMERS}
          placeholder="-- Pilih Pelaku Tindakan --"
          register={register}
          required
        />
        <SelectField
          disabled={disabled}
          error={errors.similar_incident_occurred?.message}
          label="Apakah Kejadian Serupa Pernah Terjadi?"
          name="similar_incident_occurred"
          options={SIMILAR_HISTORY_OPTIONS}
          placeholder="-- Pilih Riwayat --"
          register={register}
          required
        />
        {similarOccurred === "YA" && (
          <TextAreaField
            className="sm:col-span-2"
            disabled={disabled}
            error={errors.similar_incident_details?.message}
            label="Kapan Kejadian Serupa Terjadi & Pencegahannya"
            name="similar_incident_details"
            placeholder="Jelaskan perkiraan waktu kejadian sebelumnya dan langkah pencegahan yang pernah ditetapkan…"
            register={register}
            required
            rows={2}
          />
        )}
      </div>
    </FormSection>
  )
}
