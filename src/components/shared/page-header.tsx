import type { ReactNode } from "react"
import { IconChevronRight } from "@tabler/icons-react"
import { Link } from "react-router"

import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: string
  description?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <li className="flex items-center gap-1" key={`${crumb.label}-${String(index)}`}>
                  {index > 0 && <IconChevronRight aria-hidden="true" className="size-3.5 shrink-0 opacity-60" />}
                  {crumb.to && !isLast ? (
                    <Link
                      className="rounded-sm transition-colors hover:text-foreground hover:underline hover:underline-offset-2"
                      to={crumb.to}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={isLast ? "page" : undefined} className={isLast ? "font-medium text-foreground" : undefined}>
                      {crumb.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {children}
    </header>
  )
}
