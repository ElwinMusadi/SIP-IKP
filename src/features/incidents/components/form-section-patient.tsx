import type { FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form"

import { FormSection } from "@/components/shared/form-section"
import type { IncidentFormData } from "../schemas/incident-form-schema"
import type { MasterDataPayload } from "../types/incident"
import { DateField, SelectField, TextField } from "./form-controls"

interface FormSectionPatientProps {
  register: UseFormRegister<IncidentFormData>
  errors: FieldErrors<IncidentFormData>
  masterData?: MasterDataPayload | null
  disabled?: boolean
  watch: UseFormWatch<IncidentFormData>
  setValue: UseFormSetValue<IncidentFormData>
}

const AGE_CATEGORIES = [
  { value: "0_1_bulan", label: "0 - 1 Bulan" },
  { value: ">1_bulan_1_tahun", label: "> 1 Bulan - 1 Tahun" },
  { value: ">1_5_tahun", label: "> 1 Tahun - 5 Tahun" },
  { value: ">5_15_tahun", label: "> 5 Tahun - 15 Tahun" },
  { value: ">15_30_tahun", label: "> 15 Tahun - 30 Tahun" },
  { value: ">30_65_tahun", label: "> 30 Tahun - 65 Tahun" },
  { value: ">65_tahun", label: "> 65 Tahun" },
]

const GENDER_OPTIONS = [
  { value: "LAKI_LAKI", label: "Laki-laki" },
  { value: "PEREMPUAN", label: "Perempuan" },
]

const FALLBACK_PAYER_TYPES = [
  { value: "BPJS Kesehatan", label: "BPJS Kesehatan" },
  { value: "Umum / Pribadi", label: "Umum / Pribadi" },
  { value: "Asuransi Swasta", label: "Asuransi Swasta" },
  { value: "Jaminan Perusahaan", label: "Jaminan Perusahaan" },
]

export function FormSectionPatient({
  register,
  errors,
  masterData,
  disabled = false,
  watch,
  setValue,
}: FormSectionPatientProps) {
  const payerOptions =
    masterData?.payerTypes.map((payer) => ({ value: payer.name, label: payer.name })) ??
    FALLBACK_PAYER_TYPES

  return (
    <FormSection
      description="Identitas pasien yang terkait dengan insiden keselamatan pasien di IBS."
      id="section-pasien"
      step={1}
      title="Data Pasien"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          disabled={disabled}
          error={errors.patient_name?.message}
          label="Nama Pasien"
          name="patient_name"
          placeholder="Nama lengkap pasien"
          register={register}
          required
        />
        <TextField
          disabled={disabled}
          error={errors.medical_record_number?.message}
          label="Nomor Rekam Medis (No. RM)"
          name="medical_record_number"
          placeholder="Contoh: 12-34-56"
          register={register}
          required
        />
        <TextField
          disabled={disabled}
          error={errors.patient_room?.message}
          label="Ruangan / Bangsal Pasien"
          name="patient_room"
          placeholder="Ruang asal rawat inap atau kamar operasi"
          register={register}
          required
        />
        <SelectField
          disabled={disabled}
          error={errors.patient_age_category?.message}
          label="Kelompok Umur"
          name="patient_age_category"
          options={AGE_CATEGORIES}
          placeholder="-- Pilih Kelompok Umur --"
          register={register}
          required
        />
        <SelectField
          disabled={disabled}
          error={errors.patient_gender?.message}
          label="Jenis Kelamin"
          name="patient_gender"
          options={GENDER_OPTIONS}
          register={register}
          required
        />
        <SelectField
          disabled={disabled}
          error={errors.patient_payer_type?.message}
          label="Penanggung Biaya"
          name="patient_payer_type"
          options={payerOptions}
          placeholder="-- Pilih Penanggung Biaya --"
          register={register}
          required
        />
        <DateField
          className="sm:col-span-2 sm:max-w-md"
          disabled={disabled}
          error={errors.admission_datetime?.message}
          label="Tanggal & Jam Masuk Rumah Sakit"
          name="admission_datetime"
          setValue={setValue}
          watch={watch}
          required
          mode="datetime"
        />
      </div>
    </FormSection>
  )
}
