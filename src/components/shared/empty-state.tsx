import type { ComponentType, ReactNode } from "react"
import { IconFolderOff } from "@tabler/icons-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description?: ReactNode
  icon?: ComponentType<{ className?: string }>
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = IconFolderOff,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn("border-border bg-card/50 py-10", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
