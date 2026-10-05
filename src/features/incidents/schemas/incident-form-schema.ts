import { z } from "zod"
import { isNamelessLegacyReporter } from "../lib/initial-reporters"

const initialReporterFields = z.object({
  name: z.string(),
  category: z.string().trim().min(1, "Kategori pelapor wajib dipilih"),
  detail: z.string(),
  legacy: z.boolean().optional(),
})

export const initialReporterSchema = initialReporterFields.refine((row) => row.name.trim().length > 0, {
  message: "Nama/Identitas Pelapor wajib diisi",
  path: ["name"],
})

export const initialReportersSchema = z.array(initialReporterFields)
  .min(1, "Minimal satu pelapor wajib diisi")
  .superRefine((rows, context) => {
    if (isNamelessLegacyReporter(rows)) return
    rows.forEach((row, index) => {
      if (!row.name.trim()) {
        context.addIssue({
          code: "custom",
          message: "Nama/Identitas Pelapor wajib diisi",
          path: [index, "name"],
        })
      }
    })
  })

export const incidentFormSchema = z
  .object({
    // Pelapor
    reporter_name: z.string().min(1, "Nama pelapor wajib diisi"),
    reporter_role: z.string().min(1, "Peran pelapor wajib diisi"),

    // Bagian I: Data Pasien
    patient_name: z.string().min(1, "Nama pasien wajib diisi"),
    medical_record_number: z.string().min(1, "Nomor rekam medis (No. MR) wajib diisi"),
    patient_room: z.string().min(1, "Ruangan / bangsal pasien wajib diisi"),
    patient_age_category: z.string().min(1, "Kelompok umur pasien wajib dipilih"),
    patient_gender: z.enum(["LAKI_LAKI", "PEREMPUAN"], {
      error: "Jenis kelamin wajib dipilih",
    }),
    patient_payer_type: z.string().min(1, "Penanggung biaya pasien wajib dipilih"),
    admission_datetime: z
      .string()
      .min(1, "Tanggal dan jam masuk RS wajib diisi")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Format tanggal/jam masuk tidak valid"),

    // Bagian II: Rincian Kejadian Insiden
    incident_datetime: z
      .string()
      .min(1, "Tanggal dan jam insiden wajib diisi")
      .refine((val) => !Number.isNaN(Date.parse(val)), "Format tanggal/jam insiden tidak valid"),
    incident_timezone: z.string().default("Asia/Makassar"),
    incident_title: z.string().min(1, "Judul / ringkasan insiden wajib diisi"),
    chronology: z
      .string()
      .min(1, "Kronologi insiden (5W+1H) wajib diisi")
      .max(10000, "Kronologi insiden maksimal 10.000 karakter"),
    incident_type: z.enum(["KNC", "KTC", "KTD", "SENTINEL"], {
      error: "Jenis insiden wajib dipilih",
    }),
    initial_reporters: initialReportersSchema,
    incident_target: z.enum(
      ["PASIEN", "KARYAWAN_NAKES", "PENGUNJUNG", "PENDAMPING", "KELUARGA_PASIEN", "LAIN_LAIN"],
      { error: "Subjek terjadinya insiden wajib dipilih" },
    ),
    incident_target_other: z.string().optional(),
    patient_care_type: z.string().optional(),
    incident_location: z.string().min(1, "Tempat / lokasi kejadian insiden wajib dipilih"),
    clinical_specialization: z.string().min(1, "Spesialisasi klinis terkait wajib dipilih"),
    causing_unit: z.string().min(1, "Unit penyebab insiden wajib dipilih"),
    patient_impact: z.string().min(1, "Akibat / derajat cedera insiden wajib dipilih"),
    immediate_action_and_result: z
      .string()
      .min(1, "Tindakan segera yang dilakukan serta hasilnya wajib diisi"),
    action_taken_by: z.string().min(1, "Pihak yang melakukan tindakan wajib dipilih"),
    similar_incident_occurred: z
      .string()
      .min(1, "Riwayat kejadian serupa wajib dipilih (YA / TIDAK / TIDAK_TAHU)"),
    similar_incident_details: z.string().optional(),
    overdue_reason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.incident_target === "LAIN_LAIN") {
        return Boolean(data.incident_target_other && data.incident_target_other.trim().length > 0)
      }
      return true
    },
    {
      message: "Keterangan lain-lain untuk subjek insiden wajib diisi",
      path: ["incident_target_other"],
    },
  )
  .refine(
    (data) => {
      if (data.similar_incident_occurred === "YA") {
        return Boolean(
          data.similar_incident_details && data.similar_incident_details.trim().length > 0,
        )
      }
      return true
    },
    {
      message: "Detail riwayat kejadian serupa wajib diisi jika pernah terjadi sebelumnya",
      path: ["similar_incident_details"],
    },
  )

export type IncidentFormData = z.infer<typeof incidentFormSchema>

export const investigationFormSchema = z
  .object({
    direct_cause: z.string().min(1, "Penyebab langsung wajib diisi"),
    underlying_root_cause: z.string().min(1, "Akar masalah wajib diisi"),
    investigation_start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal mulai harus YYYY-MM-DD"),
    investigation_end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal selesai harus YYYY-MM-DD"),
    recommendations: z
      .array(
        z.object({
          text: z.string().min(1, "Rekomendasi wajib diisi"),
          responsible: z.string().min(1, "Penanggung jawab wajib diisi"),
          target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Target tanggal YYYY-MM-DD"),
        }),
      )
      .min(1, "Minimal satu rekomendasi lengkap wajib diisi"),
    actions: z
      .array(
        z.object({
          text: z.string().min(1, "Tindakan wajib diisi"),
          responsible: z.string().min(1, "Penanggung jawab wajib diisi"),
          target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Target tanggal YYYY-MM-DD"),
        }),
      )
      .min(1, "Minimal satu tindakan perbaikan lengkap wajib diisi"),
  })
  .refine((data) => data.investigation_end_date >= data.investigation_start_date, {
    message: "Tanggal selesai investigasi tidak boleh mendahului tanggal mulai",
    path: ["investigation_end_date"],
  })

export type InvestigationFormData = z.infer<typeof investigationFormSchema>
