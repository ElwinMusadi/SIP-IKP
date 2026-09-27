import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function InlineLoader({ label = "Memuat…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground", className)}>
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} role="status" aria-label="Memuat data">
      <Skeleton className="h-9 w-full rounded-lg" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton className="h-12 w-full rounded-lg" key={index} />
      ))}
      <span className="sr-only">Memuat data…</span>
    </div>
  )
}

export function CardGridSkeleton({ cards = 4, className }: { cards?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)} role="status" aria-label="Memuat data">
      {Array.from({ length: cards }).map((_, index) => (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4" key={index}>
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
      <span className="sr-only">Memuat data…</span>
    </div>
  )
}

export function PageSectionSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", className)} role="status" aria-label="Memuat halaman">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <CardGridSkeleton />
      <Skeleton className="h-64 w-full rounded-xl" />
      <span className="sr-only">Memuat halaman…</span>
    </div>
  )
}
