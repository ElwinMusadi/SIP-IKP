import type { FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form"

import { FormSection } from "@/components/shared/form-section"
import type { IncidentFormData } from "../schemas/incident-form-schema"
import type { MasterDataPayload } from "../types/incident"
import { SelectField, TextAreaField, TextField } from "./form-controls"

interface FormSectionIncidentProps {
  register: UseFormRegister<IncidentFormData>
  errors: FieldErrors<IncidentFormData>
  watch: UseFormWatch<IncidentFormData>
  masterData?: MasterDataPayload | null
  disabled?: boolean
}

const INITIAL_REPORTER_CATEGORIES = [
  "Karyawan: Dokter",
  "Karyawan: Perawat",
  "Karyawan: Petugas Lainnya",
  "Pasien",
  "Keluarga / Pendamping Pasien",
  "Pengunjung",
  "Lain-lain",
].map((value) => ({ value, label: value }))

const PATIENT_IMPACTS = [
  "Kematian",
  "Cedera Berat / Irreversible",
  "Cedera Sedang / Reversible",
  "Cedera Ringan",
  "Tidak Ada Cedera",
].map((value) => ({ value, label: value }))

const INCIDENT_TYPES = [
  { value: "KNC", label: "Kejadian Nyaris Cedera (KNC / Near Miss)" },
  { value: "KTC", label: "Kejadian Tidak Cedera (KTC / No Harm)" },
  { value: "KTD", label: "Kejadian Tidak Diharapkan (KTD / Adverse Event)" },
  { value: "SENTINEL", label: "Kejadian Sentinel (Sentinel Event)" },
]

const INCIDENT_TARGETS = [
  { value: "PASIEN", label: "Pasien" },
  { value: "KARYAWAN_NAKES", label: "Karyawan / Tenaga Kesehatan (K3RS)" },
  { value: "PENGUNJUNG", label: "Pengunjung" },
  { value: "PENDAMPING", label: "Pendamping" },
  { value: "KELUARGA_PASIEN", label: "Keluarga Pasien" },
  { value: "LAIN_LAIN", label: "Lain-lain" },
]

const PATIENT_CARE_TYPES = [
  "Rawat Inap Bedah",
  "Rawat Jalan / Poliklinik Bedah",
  "Instalasi Gawat Darurat (IGD) Bedah",
  "One Day Care (ODC) / Bedah Sehari",
  "Lainnya",
].map((value) => ({ value, label: value }))

const FALLBACK_ROOMS = [
  "Kamar Operasi 1 (Bedah Umum)",
  "Kamar Operasi 2 (Ortopedi)",
  "Kamar Operasi 3 (Urologi)",
  "Ruang Pre-Operasi",
  "Ruang Pulih Sadar (PACU)",
].map((value) => ({ value, label: value }))

const FALLBACK_SPECIALIZATIONS = [
  "Bedah Umum",
  "Bedah Ortopedi & Traumatologi",
  "Anestesiologi & Terapi Intensif",
  "Obstetri & Ginekologi",
].map((value) => ({ value, label: value }))

const FALLBACK_DEPARTMENTS = [
  "Instalasi Bedah Sentral (IBS)",
  "Instalasi Farmasi (Depo IBS)",
  "Laboratorium Patologi Klinik",
  "Ruang Rawat Inap Bedah",
].map((value) => ({ value, label: value }))

export function FormSectionIncident({
  register,
  errors,
  watch,
  masterData,
  disabled = false,
}: FormSectionIncidentProps) {
  const incidentTarget = watch("incident_target")

  const roomOptions =
    masterData?.operatingRooms.map((room) => ({ value: room.name, label: room.name })) ??
    FALLBACK_ROOMS
  const specializationOptions =
    masterData?.specializations.map((spec) => ({ value: spec.name, label: spec.name })) ??
    FALLBACK_SPECIALIZATIONS
  const departmentOptions =
    masterData?.departments.map((dept) => ({ value: dept.name, label: dept.name })) ??
    FALLBACK_DEPARTMENTS

  return (
    <FormSection
      description="Fakta kejadian, waktu, lokasi kamar operasi, sasaran insiden, dan kronologi."
      id="section-insiden"
      step={2}
      title="Rincian Kejadian Insiden"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          disabled={disabled}
          error={errors.reporter_name?.message}
          label="Nama Pelapor"
          name="reporter_name"
          placeholder="Nama nakes pembuat laporan"
          register={register}
          required
        />
        <TextField
          disabled={disabled}
          error={errors.reporter_role?.message}
          label="Peran / Profesi Pelapor"
          name="reporter_role"
          placeholder="Contoh: Perawat Bedah, Penata Anestesi"
          register={register}
          required
        />
        <TextField
          disabled={disabled}
          error={errors.incident_datetime?.message}
          label="Tanggal & Waktu Insiden"
          name="incident_datetime"
          register={register}
          required
          type="datetime-local"
        />
        <SelectField
          disabled={disabled}
          error={errors.incident_type?.message}
          label="Jenis Insiden"
          name="incident_type"
          options={INCIDENT_TYPES}
          placeholder="-- Pilih Jenis Insiden --"
          register={register}
          required
        />
        <TextField
          className="sm:col-span-2"
          disabled={disabled}
          error={errors.incident_title?.message}
          label="Judul / Ringkasan Insiden"
          name="incident_title"
          placeholder="Contoh: Kesalahan identifikasi sisi operasi pre-insisi pada OK 2"
          register={register}
          required
        />
        <TextAreaField
          className="sm:col-span-2"
          counter="Maksimal 10.000 karakter"
          disabled={disabled}
          error={errors.chronology?.message}
          label="Kronologi Insiden (5W + 1H)"
          name="chronology"
          placeholder="Ceritakan urutan kejadian secara jelas dan objektif: apa yang terjadi, siapa yang terlibat, di mana, kapan, dan bagaimana situasinya…"
          register={register}
          required
          rows={5}
        />
        <SelectField
          disabled={disabled}
          error={errors.initial_reporter_category?.message}
          label="Orang Pertama yang Melaporkan"
          name="initial_reporter_category"
          options={INITIAL_REPORTER_CATEGORIES}
          placeholder="-- Pilih Pelapor Pertama --"
          register={register}
          required
        />
        <TextField
          disabled={disabled}
          hint="Opsional — isi jika pelapor pertama bukan nakes."
          label="Detail Pelapor Pertama"
          name="initial_reporter_detail"
          placeholder="Contoh: Petugas Kebersihan, Petugas Keamanan"
          register={register}
        />
        <SelectField
          disabled={disabled}
          error={errors.incident_target?.message}
          label="Insiden Terjadi Pada (Sasaran)"
          name="incident_target"
          options={INCIDENT_TARGETS}
          register={register}
          required
        />
        <SelectField
          disabled={disabled}
          label="Jenis Pelayanan Pasien"
          name="patient_care_type"
          options={PATIENT_CARE_TYPES}
          placeholder="-- Pilih Jenis Pelayanan --"
          register={register}
        />
        {incidentTarget === "LAIN_LAIN" && (
          <TextField
            className="sm:col-span-2"
            disabled={disabled}
            error={errors.incident_target_other?.message}
            label="Keterangan Sasaran Insiden"
            name="incident_target_other"
            placeholder="Tentukan pihak sasaran insiden"
            register={register}
            required
          />
        )}
        <SelectField
          disabled={disabled}
          error={errors.incident_location?.message}
          label="Tempat / Lokasi Kejadian (IBS)"
          name="incident_location"
          options={roomOptions}
          placeholder="-- Pilih Kamar / Lokasi --"
          register={register}
          required
        />
        <SelectField
          disabled={disabled}
          error={errors.clinical_specialization?.message}
          label="Kasus Spesialisasi Terkait"
          name="clinical_specialization"
          options={specializationOptions}
          placeholder="-- Pilih Spesialisasi --"
          register={register}
          required
        />
        <SelectField
          disabled={disabled}
          error={errors.causing_unit?.message}
          label="Unit Kerja Penyebab Insiden"
          name="causing_unit"
          options={departmentOptions}
          placeholder="-- Pilih Unit Penyebab --"
          register={register}
          required
        />
        <SelectField
          disabled={disabled}
          error={errors.patient_impact?.message}
          label="Akibat / Derajat Cedera"
          name="patient_impact"
          options={PATIENT_IMPACTS}
          placeholder="-- Pilih Derajat Cedera --"
          register={register}
          required
        />
      </div>
    </FormSection>
  )
}
