import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface DefinitionItem {
  label: string
  value: ReactNode
  /** Span two columns on wide layouts for long values (e.g. kronologi). */
  wide?: boolean
}

interface DefinitionGridProps {
  items: DefinitionItem[]
  className?: string
}

export function DefinitionGrid({ items, className }: DefinitionGridProps) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2",
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          className={cn(
            "flex flex-col gap-0.5 border-b border-border/70 px-0.5 py-2.5 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0",
            item.wide && "sm:col-span-2 sm:[&:nth-last-child(2)]:border-b",
          )}
          key={`${item.label}-${String(index)}`}
        >
          <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
          <dd className="text-sm break-words text-foreground">
            {item.value === null || item.value === undefined || item.value === "" ? (
              <span className="text-muted-foreground/70 italic">Tidak diisi</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
