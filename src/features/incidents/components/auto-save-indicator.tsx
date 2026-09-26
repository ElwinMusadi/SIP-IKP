import { IconAlertCircle, IconCheck, IconClock, IconLoader2 } from "@tabler/icons-react"

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
  className = "",
}: AutoSaveIndicatorProps) {
  switch (status) {
    case "saving":
      return (
        <div
          className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}
          role="status"
        >
          <IconLoader2 className="size-3.5 animate-spin text-primary" />
          <span>Menyimpan...</span>
        </div>
      )
    case "saved":
      return (
        <div
          className={`flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 ${className}`}
          role="status"
        >
          <IconCheck className="size-3.5" />
          <span>
            Semua perubahan tersimpan
            {lastSavedAt ? ` (${lastSavedAt.toLocaleTimeString("id-ID")})` : ""}
          </span>
        </div>
      )
    case "unsaved":
      return (
        <div
          className={`flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 ${className}`}
          role="status"
        >
          <IconClock className="size-3.5" />
          <span>Belum tersimpan</span>
        </div>
      )
    case "error":
      return (
        <div
          className={`flex items-center gap-2 text-xs text-destructive ${className}`}
          role="alert"
        >
          <IconAlertCircle className="size-3.5 shrink-0" />
          <span>
            {errorMessage
              ? `Terjadi kesalahan saat menyimpan: ${errorMessage}`
              : "Terjadi kesalahan saat menyimpan"}
          </span>
          {onRetry && (
            <button
              className="font-medium underline hover:opacity-80"
              onClick={onRetry}
              type="button"
            >
              Coba lagi
            </button>
          )}
        </div>
      )
  }
}
