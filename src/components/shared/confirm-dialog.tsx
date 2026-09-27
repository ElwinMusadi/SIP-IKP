import type { ReactNode } from "react"
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: "default" | "destructive"
  busy?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  tone = "default",
  busy = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog onOpenChange={busy ? undefined : onOpenChange} open={open}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn(
              tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            {tone === "destructive" ? <IconAlertTriangle /> : <IconInfoCircle />}
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
            variant={tone === "destructive" ? "destructive" : "default"}
          >
            {busy && <Spinner data-icon="inline-start" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
