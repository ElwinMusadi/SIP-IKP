import type { UseFormRegister, FieldErrors, UseFormWatch } from "react-hook-form"
import type { IncidentFormData } from "../schemas/incident-form-schema"
import type { MasterDataPayload } from "../types/incident"

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
]

const PATIENT_IMPACTS = [
  "Kematian",
  "Cedera Berat / Irreversible",
  "Cedera Sedang / Reversible",
  "Cedera Ringan",
  "Tidak Ada Cedera",
]

export function FormSectionIncident({
  register,
  errors,
  watch,
  masterData,
  disabled = false,
}: FormSectionIncidentProps) {
  const incidentTarget = watch("incident_target")

  return (
    <section
      aria-labelledby="section-incident-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs"
    >
      <div className="border-b pb-3">
        <h2 className="text-base font-semibold text-foreground" id="section-incident-title">
          Bagian II: Rincian Kejadian Insiden
        </h2>
        <p className="text-xs text-muted-foreground">
          Fakta kejadian, waktu, lokasi kamar operasi, subjek sasaran insiden, dan kronologi.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Identitas Pelapor */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="reporter_name">
            Nama Pelapor <span className="text-destructive">*</span>
          </label>
          <input
            {...register("reporter_name")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="reporter_name"
            placeholder="Nama nakes pembuat laporan"
            type="text"
          />
          {errors.reporter_name && (
            <p className="text-xs text-destructive">{errors.reporter_name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="reporter_role">
            Peran / Profesi Pelapor <span className="text-destructive">*</span>
          </label>
          <input
            {...register("reporter_role")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="reporter_role"
            placeholder="Contoh: Perawat Bedah, Penata Anestesi, Dokter Operator"
            type="text"
          />
          {errors.reporter_role && (
            <p className="text-xs text-destructive">{errors.reporter_role.message}</p>
          )}
        </div>

        {/* Waktu & Judul */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="incident_datetime">
            Tanggal &amp; Waktu Insiden <span className="text-destructive">*</span>
          </label>
          <input
            {...register("incident_datetime")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="incident_datetime"
            type="datetime-local"
          />
          {errors.incident_datetime && (
            <p className="text-xs text-destructive">{errors.incident_datetime.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="incident_type">
            Jenis Insiden <span className="text-destructive">*</span>
          </label>
          <select
            {...register("incident_type")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="incident_type"
          >
            <option value="">-- Pilih Jenis Insiden --</option>
            <option value="KNC">Kejadian Nyaris Cedera (KNC / Near Miss)</option>
            <option value="KTC">Kejadian Tidak Cedera (KTC / No Harm)</option>
            <option value="KTD">Kejadian Tidak Diharapkan (KTD / Adverse Event)</option>
            <option value="SENTINEL">Kejadian Sentinel (Sentinel Event)</option>
          </select>
          {errors.incident_type && (
            <p className="text-xs text-destructive">{errors.incident_type.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-foreground" htmlFor="incident_title">
            Judul / Ringkasan Insiden <span className="text-destructive">*</span>
          </label>
          <input
            {...register("incident_title")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="incident_title"
            placeholder="Contoh: Kesalahan identifikasi sisi operasi pre-insisi pada OK 2"
            type="text"
          />
          {errors.incident_title && (
            <p className="text-xs text-destructive">{errors.incident_title.message}</p>
          )}
        </div>

        {/* Kronologi */}
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground" htmlFor="chronology">
              Kronologi Insiden (5W + 1H) <span className="text-destructive">*</span>
            </label>
            <span className="text-[11px] text-muted-foreground">Maksimal 10.000 karakter</span>
          </div>
          <textarea
            {...register("chronology")}
            className="min-h-28 w-full rounded-lg border bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="chronology"
            placeholder="Ceritakan urutan kejadian secara jelas dan objektif (apa yang terjadi, siapa yang terlibat, di mana, kapan, dan bagaimana situasi saat insiden terjadi)..."
            rows={5}
          />
          {errors.chronology && (
            <p className="text-xs text-destructive">{errors.chronology.message}</p>
          )}
        </div>

        {/* Pelapor Pertama & Sasaran */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-medium text-foreground"
            htmlFor="initial_reporter_category"
          >
            Orang Pertama Melaporkan Insiden <span className="text-destructive">*</span>
          </label>
          <select
            {...register("initial_reporter_category")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="initial_reporter_category"
          >
            <option value="">-- Pilih Pelapor Pertama --</option>
            {INITIAL_REPORTER_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.initial_reporter_category && (
            <p className="text-xs text-destructive">{errors.initial_reporter_category.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="initial_reporter_detail">
            Detail Pelapor Pertama (Opsional / Jika Non-Nakes)
          </label>
          <input
            {...register("initial_reporter_detail")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="initial_reporter_detail"
            placeholder="Contoh: Petugas Kebersihan, Petugas Keamanan, dll."
            type="text"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="incident_target">
            Insiden Terjadi Pada (Sasaran Insiden) <span className="text-destructive">*</span>
          </label>
          <select
            {...register("incident_target")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="incident_target"
          >
            <option value="PASIEN">Pasien</option>
            <option value="KARYAWAN_NAKES">Karyawan / Tenaga Kesehatan (K3RS)</option>
            <option value="PENGUNJUNG">Pengunjung</option>
            <option value="PENDAMPING">Pendamping</option>
            <option value="KELUARGA_PASIEN">Keluarga Pasien</option>
            <option value="LAIN_LAIN">Lain-lain</option>
          </select>
          {errors.incident_target && (
            <p className="text-xs text-destructive">{errors.incident_target.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="patient_care_type">
            Jenis Pelayanan Pasien
          </label>
          <select
            {...register("patient_care_type")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="patient_care_type"
          >
            <option value="">-- Pilih Jenis Pelayanan --</option>
            <option value="Rawat Inap Bedah">Rawat Inap Bedah</option>
            <option value="Rawat Jalan / Poliklinik Bedah">Rawat Jalan / Poliklinik Bedah</option>
            <option value="Instalasi Gawat Darurat (IGD) Bedah">
              Instalasi Gawat Darurat (IGD) Bedah
            </option>
            <option value="One Day Care (ODC) / Bedah Sehari">
              One Day Care (ODC) / Bedah Sehari
            </option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        {incidentTarget === "LAIN_LAIN" && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-foreground" htmlFor="incident_target_other">
              Keterangan Sasaran Insiden Lain-lain <span className="text-destructive">*</span>
            </label>
            <input
              {...register("incident_target_other")}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              disabled={disabled}
              id="incident_target_other"
              placeholder="Tentukan pihak sasaran insiden"
              type="text"
            />
            {errors.incident_target_other && (
              <p className="text-xs text-destructive">{errors.incident_target_other.message}</p>
            )}
          </div>
        )}

        {/* Lokasi, Spesialisasi & Unit Penyebab */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="incident_location">
            Tempat / Lokasi Kejadian (IBS) <span className="text-destructive">*</span>
          </label>
          <select
            {...register("incident_location")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="incident_location"
          >
            <option value="">-- Pilih Kamar / Lokasi --</option>
            {masterData?.operatingRooms.map((room) => (
              <option key={room.id} value={room.name}>
                {room.name}
              </option>
            )) ?? (
              <>
                <option value="Kamar Operasi 1 (Bedah Umum)">Kamar Operasi 1 (Bedah Umum)</option>
                <option value="Kamar Operasi 2 (Ortopedi)">Kamar Operasi 2 (Ortopedi)</option>
                <option value="Kamar Operasi 3 (Urologi)">Kamar Operasi 3 (Urologi)</option>
                <option value="Ruang Pre-Operasi">Ruang Pre-Operasi</option>
                <option value="Ruang Pulih Sadar (PACU)">Ruang Pulih Sadar (PACU)</option>
              </>
            )}
          </select>
          {errors.incident_location && (
            <p className="text-xs text-destructive">{errors.incident_location.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="clinical_specialization">
            Kasus Spesialisasi Terkait <span className="text-destructive">*</span>
          </label>
          <select
            {...register("clinical_specialization")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="clinical_specialization"
          >
            <option value="">-- Pilih Spesialisasi --</option>
            {masterData?.specializations.map((spec) => (
              <option key={spec.id} value={spec.name}>
                {spec.name}
              </option>
            )) ?? (
              <>
                <option value="Bedah Umum">Bedah Umum</option>
                <option value="Bedah Ortopedi & Traumatologi">
                  Bedah Ortopedi &amp; Traumatologi
                </option>
                <option value="Anestesiologi & Terapi Intensif">
                  Anestesiologi &amp; Terapi Intensif
                </option>
                <option value="Obstetri & Ginekologi">Obstetri &amp; Ginekologi</option>
              </>
            )}
          </select>
          {errors.clinical_specialization && (
            <p className="text-xs text-destructive">{errors.clinical_specialization.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="causing_unit">
            Unit Kerja Penyebab Insiden <span className="text-destructive">*</span>
          </label>
          <select
            {...register("causing_unit")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="causing_unit"
          >
            <option value="">-- Pilih Unit Penyebab --</option>
            {masterData?.departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
              </option>
            )) ?? (
              <>
                <option value="Instalasi Bedah Sentral (IBS)">Instalasi Bedah Sentral (IBS)</option>
                <option value="Instalasi Farmasi (Depo IBS)">Instalasi Farmasi (Depo IBS)</option>
                <option value="Laboratorium Patologi Klinik">Laboratorium Patologi Klinik</option>
                <option value="Ruang Rawat Inap Bedah">Ruang Rawat Inap Bedah</option>
              </>
            )}
          </select>
          {errors.causing_unit && (
            <p className="text-xs text-destructive">{errors.causing_unit.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="patient_impact">
            Akibat / Derajat Cedera <span className="text-destructive">*</span>
          </label>
          <select
            {...register("patient_impact")}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            disabled={disabled}
            id="patient_impact"
          >
            <option value="">-- Pilih Derajat Cedera --</option>
            {PATIENT_IMPACTS.map((imp) => (
              <option key={imp} value={imp}>
                {imp}
              </option>
            ))}
          </select>
          {errors.patient_impact && (
            <p className="text-xs text-destructive">{errors.patient_impact.message}</p>
          )}
        </div>
      </div>
    </section>
  )
}
