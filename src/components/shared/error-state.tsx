import type { ReactNode } from "react"
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title?: string
  message: ReactNode
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = "Gagal memuat data",
  message,
  onRetry,
  retryLabel = "Coba Lagi",
  className,
}: ErrorStateProps) {
  return (
    <Alert className={cn("border-destructive/30 bg-destructive/5 text-foreground", className)} variant="destructive">
      <IconAlertTriangle />
      <AlertTitle className="text-destructive">{title}</AlertTitle>
      <AlertDescription className="text-foreground/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>{message}</span>
          {onRetry && (
            <Button
              className="shrink-0 sm:ml-3"
              onClick={onRetry}
              size="sm"
              type="button"
              variant="outline"
            >
              <IconRefresh data-icon="inline-start" />
              {retryLabel}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
