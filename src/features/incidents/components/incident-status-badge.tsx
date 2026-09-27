import { Badge } from "@/components/ui/badge"
import { INCIDENT_STATUS_META, type StatusMeta } from "../lib/labels"
import type { IncidentStatus } from "../types/incident"
import { cn } from "@/lib/utils"

interface IncidentStatusBadgeProps {
  status: IncidentStatus
  className?: string
  /** Tampilkan label lengkap alih-alih label ringkas. */
  full?: boolean
}

export function IncidentStatusBadge({ status, className, full = false }: IncidentStatusBadgeProps) {
  const meta = INCIDENT_STATUS_META[status] as StatusMeta | undefined

  if (!meta) {
    return (
      <Badge className={className} variant="secondary">
        {status}
      </Badge>
    )
  }

  return (
    <Badge
      className={cn("gap-1.5 border-transparent font-medium", meta.badgeClass, className)}
      title={meta.full}
      variant="outline"
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", meta.dotClass)} />
      {full ? meta.full : meta.label}
    </Badge>
  )
}
