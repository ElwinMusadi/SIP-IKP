import type { UseFormRegister, FieldErrors } from "react-hook-form"
import type { IncidentFormData } from "../schemas/incident-form-schema"
import type { MasterDataPayload } from "../types/incident"

interface FormSectionPatientProps {
  register: UseFormRegister<IncidentFormData>
  errors: FieldErrors<IncidentFormData>
  masterData?: MasterDataPayload | null
  disabled?: boolean
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

export function FormSectionPatient({
  register,
  errors,
  masterData,
  disabled = false,
}: FormSectionPatientProps) {
  return (
    <section
      aria-labelledby="section-patient-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs"
    >
      <div className="border-b pb-3">
        <h2 className="text-base font-semibold text-foreground" id="section-patient-title">
          Bagian I: Data Pasien
        </h2>
        <p className="text-xs text-muted-foreground">
          Identitas pasien yang terkait dengan insiden keselamatan pasien di IBS.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="patient_name">
            Nama Pasien <span className="text-destructive">*</span>
          </label>
          <input
            {...register("patient_name")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="patient_name"
            placeholder="Nama lengkap pasien"
            type="text"
          />
          {errors.patient_name && (
            <p className="text-xs text-destructive">{errors.patient_name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="medical_record_number">
            Nomor Rekam Medis (No. MR) <span className="text-destructive">*</span>
          </label>
          <input
            {...register("medical_record_number")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="medical_record_number"
            placeholder="Contoh: 12-34-56 atau EMERGENCY-..."
            type="text"
          />
          {errors.medical_record_number && (
            <p className="text-xs text-destructive">{errors.medical_record_number.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="patient_room">
            Ruangan / Bangsal Pasien <span className="text-destructive">*</span>
          </label>
          <input
            {...register("patient_room")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="patient_room"
            placeholder="Ruang asal rawat inap atau kamar operasi"
            type="text"
          />
          {errors.patient_room && (
            <p className="text-xs text-destructive">{errors.patient_room.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="patient_age_category">
            Kelompok Umur Pasien <span className="text-destructive">*</span>
          </label>
          <select
            {...register("patient_age_category")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="patient_age_category"
          >
            <option value="">-- Pilih Kelompok Umur --</option>
            {AGE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.patient_age_category && (
            <p className="text-xs text-destructive">{errors.patient_age_category.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="patient_gender">
            Jenis Kelamin Pasien <span className="text-destructive">*</span>
          </label>
          <select
            {...register("patient_gender")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="patient_gender"
          >
            <option value="">-- Pilih Jenis Kelamin --</option>
            <option value="LAKI_LAKI">Laki-laki</option>
            <option value="PEREMPUAN">Perempuan</option>
          </select>
          {errors.patient_gender && (
            <p className="text-xs text-destructive">{errors.patient_gender.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="patient_payer_type">
            Penanggung Biaya Pasien <span className="text-destructive">*</span>
          </label>
          <select
            {...register("patient_payer_type")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="patient_payer_type"
          >
            <option value="">-- Pilih Penanggung Biaya --</option>
            {masterData?.payerTypes.map((payer) => (
              <option key={payer.id} value={payer.name}>
                {payer.name}
              </option>
            )) ?? (
              <>
                <option value="BPJS Kesehatan">BPJS Kesehatan</option>
                <option value="Umum / Pribadi">Umum / Pribadi</option>
                <option value="Asuransi Swasta">Asuransi Swasta</option>
                <option value="Jaminan Perusahaan">Jaminan Perusahaan</option>
              </>
            )}
          </select>
          {errors.patient_payer_type && (
            <p className="text-xs text-destructive">{errors.patient_payer_type.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-foreground" htmlFor="admission_datetime">
            Tanggal &amp; Jam Masuk Rumah Sakit <span className="text-destructive">*</span>
          </label>
          <input
            {...register("admission_datetime")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 sm:max-w-md"
            disabled={disabled}
            id="admission_datetime"
            type="datetime-local"
          />
          {errors.admission_datetime && (
            <p className="text-xs text-destructive">{errors.admission_datetime.message}</p>
          )}
        </div>
      </div>
    </section>
  )
}
