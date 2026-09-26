import { IconHistory, IconNotes } from "@tabler/icons-react"
import type { AuditRecord } from "../types/incident"

interface AuditTimelineViewProps {
  records: AuditRecord[]
}

export function AuditTimelineView({ records }: AuditTimelineViewProps) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-xs text-muted-foreground">
        Belum ada jejak audit yang terekam.
      </div>
    )
  }

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case "DRAFT_CREATED":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      case "REPORT_SUBMITTED":
        return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
      case "REVISION_REQUIRED":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      case "SIMPLE_INVESTIGATION_COMPLETED":
        return "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
      case "REPORT_COMPLETED":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      case "EMERGENCY_CORRECTION":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatEventLabel = (eventType: string) => {
    switch (eventType) {
      case "DRAFT_CREATED":
        return "Draf Dibuat"
      case "REPORT_SUBMITTED":
        return "Laporan Resmi Dikirimkan"
      case "REVISION_REQUIRED":
        return "Permintaan Perbaikan / Revisi"
      case "SIMPLE_INVESTIGATION_COMPLETED":
        return "Investigasi Sederhana Diselesaikan"
      case "REPORT_COMPLETED":
        return "Laporan Diselesaikan (Selesai)"
      case "EMERGENCY_CORRECTION":
        return "Koreksi Darurat Dilakukan"
      default:
        return eventType
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex items-center gap-2 border-b pb-3">
        <IconHistory className="size-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Jejak Audit Laporan (Audit Trail)</h3>
      </div>

      <ol className="relative flex flex-col gap-4 border-l border-muted-foreground/20 pl-4 text-xs">
        {records.map((rec) => (
          <li className="relative flex flex-col gap-1" key={rec.id}>
            <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary ring-4 ring-background" />
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 font-semibold text-[11px] ${getEventBadgeColor(rec.eventType)}`}
              >
                {formatEventLabel(rec.eventType)}
              </span>
              <span className="text-muted-foreground">
                {new Date(rec.occurredAt).toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-foreground">
              <span className="font-semibold">{rec.actorName}</span>
              <span className="text-muted-foreground">({rec.actorRole})</span>
            </div>

            {rec.notes && (
              <div className="mt-1 flex items-start gap-1.5 rounded-md border bg-muted/30 p-2 text-muted-foreground">
                <IconNotes className="size-3.5 shrink-0 text-primary mt-0.5" />
                <span className="whitespace-pre-wrap">{rec.notes}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
