import { IconHistory, IconNotes } from "@tabler/icons-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AuditRecord } from "../types/incident"

interface AuditTimelineViewProps {
  records: AuditRecord[]
}

const EVENT_STYLES: Record<string, { label: string; className: string }> = {
  DRAFT_CREATED: { label: "Draf dibuat", className: "bg-status-neutral text-status-neutral-foreground" },
  REPORT_SUBMITTED: { label: "Laporan resmi dikirim", className: "bg-status-info text-status-info-foreground" },
  REVISION_REQUIRED: { label: "Permintaan perbaikan", className: "bg-status-warning text-status-warning-foreground" },
  SIMPLE_INVESTIGATION_COMPLETED: {
    label: "Investigasi sederhana selesai",
    className: "bg-primary/10 text-primary",
  },
  REPORT_COMPLETED: { label: "Laporan diselesaikan", className: "bg-status-success text-status-success-foreground" },
  EMERGENCY_CORRECTION: { label: "Koreksi darurat", className: "bg-risk-red text-risk-red-foreground" },
}

export function AuditTimelineView({ records }: AuditTimelineViewProps) {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="py-4">
          <EmptyState
            className="border-0 bg-transparent py-4"
            description="Aktivitas pada laporan ini akan tercatat otomatis di sini."
            icon={IconHistory}
            title="Belum ada jejak audit"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <IconHistory aria-hidden="true" className="size-4 text-primary" />
          Jejak Audit Laporan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-5 border-l border-border pl-5 text-xs">
          {records.map((rec) => {
            const eventStyle = EVENT_STYLES[rec.eventType] ?? {
              label: rec.eventType,
              className: "bg-muted text-muted-foreground",
            }
            return (
              <li className="relative flex flex-col gap-1.5" key={rec.id}>
                <span
                  aria-hidden="true"
                  className="absolute top-1 -left-[26.5px] size-2.5 rounded-full border-2 border-background bg-primary ring-1 ring-primary/30"
                />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${eventStyle.className}`}
                  >
                    {eventStyle.label}
                  </span>
                  <time className="text-muted-foreground tabular-nums" dateTime={rec.occurredAt}>
                    {new Date(rec.occurredAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>

                <div className="flex flex-wrap items-center gap-x-1.5 text-foreground">
                  <span className="font-semibold">{rec.actorName}</span>
                  <span className="text-muted-foreground">· {rec.actorRole}</span>
                </div>

                {rec.notes && (
                  <div className="mt-0.5 flex items-start gap-1.5 rounded-md border bg-muted/30 p-2.5 text-muted-foreground">
                    <IconNotes aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    <span className="leading-5 whitespace-pre-wrap">{rec.notes}</span>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
