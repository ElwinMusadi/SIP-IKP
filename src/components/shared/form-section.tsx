import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface FormSectionProps {
  step?: number
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}

export function FormSection({
  step,
  title,
  description,
  actions,
  children,
  className,
  id,
}: FormSectionProps) {
  return (
    <Card className={cn("scroll-mt-20 py-0", className)} id={id}>
      <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {step !== undefined && (
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums"
              >
                {step}
              </span>
            )}
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold sm:text-base">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-0.5 text-xs sm:text-sm">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4 sm:px-5">{children}</CardContent>
    </Card>
  )
}
