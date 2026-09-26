import { Badge } from "@/components/ui/badge"

interface SlaBadgeProps {
  isOverdue: boolean | number
  deadlineUtc?: string | null
  className?: string
}

export function SlaBadge({ isOverdue, deadlineUtc, className }: SlaBadgeProps) {
  const overdue = Boolean(isOverdue)

  if (overdue) {
    return (
      <Badge
        className={`bg-destructive/10 text-destructive border-destructive/20 font-medium ${className ?? ""}`}
        variant="outline"
      >
        Terlambat Pelaporan (&gt; 48 Jam)
      </Badge>
    )
  }

  return (
    <Badge
      className={`bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 font-medium ${className ?? ""}`}
      variant="outline"
      title={
        deadlineUtc ? `Batas waktu: ${new Date(deadlineUtc).toLocaleString("id-ID")}` : undefined
      }
    >
      Tepat Waktu (&le; 48 Jam)
    </Badge>
  )
}
