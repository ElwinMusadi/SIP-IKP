import type { IncidentStatus, IncidentTarget, IncidentType, RiskGrade } from "../types/incident"

export interface StatusMeta {
  /** Label ringkas untuk badge/tabel. */
  label: string
  /** Label lengkap untuk detail/penjelasan. */
  full: string
  /** Kelas badge (background + teks token semantik). */
  badgeClass: string
  /** Kelas warna dot. */
  dotClass: string
}

export const INCIDENT_STATUS_META: Record<IncidentStatus, StatusMeta> = {
  DRAFT: {
    label: "Draf",
    full: "Draf (belum terkirim)",
    badgeClass: "bg-status-neutral text-status-neutral-foreground",
    dotClass: "bg-status-neutral-foreground/60",
  },
  SUBMITTED: {
    label: "Terkirim",
    full: "Terkirim — menunggu verifikasi Kepala Ruangan",
    badgeClass: "bg-status-info text-status-info-foreground",
    dotClass: "bg-status-info-foreground",
  },
  REVISION_REQUIRED: {
    label: "Perlu Perbaikan",
    full: "Perlu perbaikan oleh pelapor",
    badgeClass: "bg-status-warning text-status-warning-foreground",
    dotClass: "bg-status-warning-foreground",
  },
  UNDER_REVIEW: {
    label: "Sedang Ditinjau",
    full: "Sedang ditinjau Kepala Ruangan",
    badgeClass: "bg-status-pending text-status-pending-foreground",
    dotClass: "bg-status-pending-foreground",
  },
  SIMPLE_INVESTIGATION: {
    label: "Investigasi Sederhana",
    full: "Investigasi sederhana oleh unit",
    badgeClass: "bg-primary/10 text-primary",
    dotClass: "bg-primary",
  },
  PMKP_REVIEW: {
    label: "Tinjauan PMKP",
    full: "Dalam tinjauan Komite PMKP",
    badgeClass: "bg-status-pending text-status-pending-foreground",
    dotClass: "bg-status-pending-foreground",
  },
  COMPLETED_BY_UNIT: {
    label: "Selesai (Unit)",
    full: "Selesai di tingkat unit",
    badgeClass: "bg-status-success text-status-success-foreground",
    dotClass: "bg-status-success-foreground",
  },
  COMPLETED: {
    label: "Selesai",
    full: "Selesai (kasus ditutup)",
    badgeClass: "bg-status-success-foreground text-status-success",
    dotClass: "bg-status-success",
  },
}

export interface RiskMeta {
  label: string
  full: string
  badgeClass: string
  dotClass: string
}

export const RISK_GRADE_META: Record<RiskGrade, RiskMeta> = {
  BIRU: {
    label: "Rendah (Biru)",
    full: "Risiko Rendah — pita BIRU",
    badgeClass: "bg-risk-blue text-risk-blue-foreground",
    dotClass: "bg-risk-blue-foreground",
  },
  HIJAU: {
    label: "Sedang (Hijau)",
    full: "Risiko Sedang — pita HIJAU",
    badgeClass: "bg-risk-green text-risk-green-foreground",
    dotClass: "bg-risk-green-foreground",
  },
  KUNING: {
    label: "Tinggi (Kuning)",
    full: "Risiko Tinggi — pita KUNING",
    badgeClass: "bg-risk-yellow text-risk-yellow-foreground",
    dotClass: "bg-risk-yellow-foreground",
  },
  MERAH: {
    label: "Ekstrem (Merah)",
    full: "Risiko Ekstrem — pita MERAH",
    badgeClass: "bg-risk-red text-risk-red-foreground",
    dotClass: "bg-risk-red-foreground",
  },
}

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  KNC: "KNC — Kejadian Nyaris Cedera",
  KTC: "KTC — Kejadian Tidak Cedera",
  KTD: "KTD — Kejadian Tidak Diharapkan",
  SENTINEL: "Sentinel — Kejadian Sentinel",
}

export const INCIDENT_TYPE_SHORT_LABELS: Record<IncidentType, string> = {
  KNC: "KNC",
  KTC: "KTC",
  KTD: "KTD",
  SENTINEL: "Sentinel",
}

export const INCIDENT_TARGET_LABELS: Record<IncidentTarget, string> = {
  PASIEN: "Pasien",
  KARYAWAN_NAKES: "Karyawan / Tenaga Kesehatan",
  PENGUNJUNG: "Pengunjung",
  PENDAMPING: "Pendamping",
  KELUARGA_PASIEN: "Keluarga Pasien",
  LAIN_LAIN: "Lainnya",
}
