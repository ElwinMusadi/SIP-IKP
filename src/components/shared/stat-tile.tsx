import type { ComponentType, ReactNode } from "react"

import { cn } from "@/lib/utils"

export type StatTone = "default" | "primary" | "warning" | "success" | "danger" | "pending"

const toneStyles: Record<StatTone, { icon: string; value?: string }> = {
  default: { icon: "bg-muted text-muted-foreground" },
  primary: { icon: "bg-primary/10 text-primary" },
  warning: { icon: "bg-status-warning text-status-warning-foreground" },
  success: { icon: "bg-status-success text-status-success-foreground" },
  danger: { icon: "bg-risk-red text-risk-red-foreground" },
  pending: { icon: "bg-status-pending text-status-pending-foreground" },
}

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ComponentType<{ className?: string }>
  tone?: StatTone
  onClick?: () => void
  className?: string
}

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  onClick,
  className,
}: StatTileProps) {
  const toneStyle = toneStyles[tone]
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span
            aria-hidden="true"
            className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", toneStyle.icon)}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-1 font-heading text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </>
  )

  if (onClick) {
    return (
      <button
        className={cn(
          "flex w-full flex-col rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-px",
          className,
        )}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    )
  }

  return (
    <div className={cn("flex flex-col rounded-xl border bg-card p-4", className)}>{content}</div>
  )
}
