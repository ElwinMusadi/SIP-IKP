import { Badge } from "@/components/ui/badge"
import { RISK_GRADE_META } from "../lib/labels"
import type { RiskGrade } from "../types/incident"
import { cn } from "@/lib/utils"

interface RiskBadgeProps {
  grade?: RiskGrade | null
  className?: string
  /** Tampilkan label lengkap alih-alih label ringkas. */
  full?: boolean
}

export function RiskBadge({ grade, className, full = false }: RiskBadgeProps) {
  if (!grade) {
    return (
      <Badge className={cn("gap-1.5 font-medium", className)} variant="outline">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
        Belum Dinilai
      </Badge>
    )
  }

  const meta = RISK_GRADE_META[grade]

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
