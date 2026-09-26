import { Badge } from "@/components/ui/badge"
import type { IncidentStatus } from "../types/incident"

interface IncidentStatusBadgeProps {
  status: IncidentStatus
  className?: string
}

export function IncidentStatusBadge({ status, className }: IncidentStatusBadgeProps) {
  switch (status) {
    case "DRAFT":
      return (
        <Badge className={className} variant="outline">
          Draf (Belum Terkirim)
        </Badge>
      )
    case "SUBMITTED":
      return (
        <Badge
          className={`bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 ${className ?? ""}`}
          variant="outline"
        >
          Terkirim (Menunggu Verifikasi)
        </Badge>
      )
    case "REVISION_REQUIRED":
      return (
        <Badge
          className={`bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 ${className ?? ""}`}
          variant="outline"
        >
          Perlu Perbaikan (Revisi)
        </Badge>
      )
    case "UNDER_REVIEW":
      return (
        <Badge
          className={`bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 ${className ?? ""}`}
          variant="outline"
        >
          Sedang Ditinjau Kepala Ruangan
        </Badge>
      )
    case "SIMPLE_INVESTIGATION":
      return (
        <Badge
          className={`bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 ${className ?? ""}`}
          variant="outline"
        >
          Investigasi Sederhana
        </Badge>
      )
    case "PMKP_REVIEW":
      return (
        <Badge
          className={`bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 ${className ?? ""}`}
          variant="outline"
        >
          Tinjauan Komite PMKP
        </Badge>
      )
    case "COMPLETED_BY_UNIT":
      return (
        <Badge
          className={`bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 ${className ?? ""}`}
          variant="outline"
        >
          Selesai di Tingkat Unit
        </Badge>
      )
    case "COMPLETED":
      return (
        <Badge
          className={`bg-emerald-600 text-white dark:bg-emerald-500 ${className ?? ""}`}
          variant="default"
        >
          Selesai (Kasus Ditutup)
        </Badge>
      )
    default:
      return (
        <Badge className={className} variant="secondary">
          {status}
        </Badge>
      )
  }
}
