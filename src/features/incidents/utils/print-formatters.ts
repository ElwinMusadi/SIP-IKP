export function parsePrintTableRows<T>(
  raw: string | T[] | undefined,
  context: "recommendations" | "actions",
): T[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== "string" || raw.trim() === "") return []

  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as T[]

    console.warn(`Data tabel cetak ${context} bukan array; menggunakan daftar kosong.`)
  } catch {
    console.warn(`Data tabel cetak ${context} tidak valid; menggunakan daftar kosong.`)
  }

  return []
}

export function formatPrintStatus(status: string): string {
  switch (status) {
    case "DRAFT":
      return "DRAF — BELUM MENJADI LAPORAN RESMI"
    case "SUBMITTED":
      return "TERKIRIM (MENUNGGU VERIFIKASI KEPALA RUANGAN)"
    case "REVISION_REQUIRED":
      return "PERLU PERBAIKAN / REVISI DARI PELAPOR"
    case "UNDER_REVIEW":
      return "SEDANG DITINJAU OLEH KEPALA RUANGAN IBS"
    case "SIMPLE_INVESTIGATION":
      return "DALAM INVESTIGASI SEDERHANA TINGKAT UNIT"
    case "PMKP_REVIEW":
      return "DALAM TINJAUAN MUTU KOMITE PMKP"
    case "COMPLETED_BY_UNIT":
      return "SELESAI DI TINGKAT UNIT (COMPLETED_BY_UNIT)"
    case "COMPLETED":
      return "SELESAI (KASUS DITUTUP RESMI)"
    default:
      return status
  }
}

export function formatPrintAuditLabel(type: string): string {
  switch (type) {
    case "DRAFT_CREATED":
      return "Draf Dibuat"
    case "REPORT_SUBMITTED":
      return "Laporan Resmi Dikirimkan"
    case "REVISION_REQUIRED":
      return "Permintaan Perbaikan / Revisi"
    case "SIMPLE_INVESTIGATION_COMPLETED":
      return "Investigasi Sederhana Diselesaikan"
    case "REPORT_COMPLETED":
      return "Laporan Selesai (Kasus Ditutup)"
    case "EMERGENCY_CORRECTION":
      return "Koreksi Darurat Dilakukan"
    default:
      return type
  }
}
