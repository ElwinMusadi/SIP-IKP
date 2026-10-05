import { normalizeInitialReporters } from "../lib/initial-reporters"
import type { IncidentReport } from "../types/incident"

export function InitialReportersList({ report }: { report: IncidentReport }) {
  const reporters = normalizeInitialReporters(report)
  if (!reporters.length) return <span>-</span>
  return (
    <ol className="flex min-w-0 flex-col gap-3" aria-label="Daftar pelapor pertama">
      {reporters.map((reporter, index) => (
        <li key={index} className="min-w-0 break-words">
          <p className="font-medium">Pelapor {index + 1}</p>
          <dl className="flex flex-col gap-1">
            <div><dt className="inline">Nama/Identitas Pelapor: </dt><dd className="inline">{reporter.name || "Tidak tercatat"}</dd></div>
            <div><dt className="inline">Kategori: </dt><dd className="inline">{reporter.category || "-"}</dd></div>
            <div><dt className="inline">Detail: </dt><dd className="inline">{reporter.detail || "-"}</dd></div>
          </dl>
        </li>
      ))}
    </ol>
  )
}
