import { IconAlertCircle, IconCheck, IconClock, IconRefresh } from "@tabler/icons-react"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export type SaveStatus = "saved" | "unsaved" | "saving" | "error"

interface AutoSaveIndicatorProps {
  status: SaveStatus
  lastSavedAt?: Date | null
  errorMessage?: string | null
  onRetry?: () => void
  className?: string
}

export function AutoSaveIndicator({
  status,
  lastSavedAt,
  errorMessage,
  onRetry,
  className,
}: AutoSaveIndicatorProps) {
  switch (status) {
    case "saving":
      return (
        <div
          className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}
          role="status"
        >
          <Spinner className="size-3.5 text-primary" />
          <span>Menyimpan…</span>
        </div>
      )
    case "saved":
      return (
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs text-status-success-foreground",
            className,
          )}
          role="status"
        >
          <IconCheck className="size-3.5" />
          <span>
            Perubahan tersimpan
            {lastSavedAt ? ` · ${lastSavedAt.toLocaleTimeString("id-ID")}` : ""}
          </span>
        </div>
      )
    case "unsaved":
      return (
        <div
          className={cn("flex items-center gap-1.5 text-xs text-status-warning-foreground", className)}
          role="status"
        >
          <IconClock className="size-3.5" />
          <span>Belum tersimpan</span>
        </div>
      )
    case "error":
      return (
        <div className={cn("flex items-center gap-2 text-xs text-destructive", className)} role="alert">
          <IconAlertCircle className="size-3.5 shrink-0" />
          <span>
            {errorMessage ? `Gagal menyimpan: ${errorMessage}` : "Terjadi kesalahan saat menyimpan"}
          </span>
          {onRetry && (
            <button
              className="inline-flex items-center gap-1 font-medium underline hover:opacity-80"
              onClick={onRetry}
              type="button"
            >
              <IconRefresh className="size-3" />
              Coba lagi
            </button>
          )}
        </div>
      )
  }
}
