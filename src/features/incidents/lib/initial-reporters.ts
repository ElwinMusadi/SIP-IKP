import type { InitialReporter, IncidentReport } from "../types/incident"

type ReporterSource = Pick<
  IncidentReport,
  "initial_reporters" | "initial_reporter_category" | "initial_reporter_detail"
>

export interface InitialReporterFormRow extends InitialReporter {
  // Form-only provenance. Never sent to the API.
  legacy?: boolean | undefined
}

export function normalizeInitialReporters(source: ReporterSource): InitialReporter[] {
  let raw: unknown = source.initial_reporters
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw)
    } catch {
      raw = null
    }
  }
  if (
    Array.isArray(raw) &&
    raw.every(
      (row: unknown) =>
        typeof row === "object" && row !== null && !Array.isArray(row) &&
        "name" in row && typeof row.name === "string" &&
        "category" in row && typeof row.category === "string" &&
        (!('detail' in row) || row.detail === null || typeof row.detail === "string"),
    )
  ) {
    return raw.map((row: { name: string; category: string; detail?: string | null }) => ({
      name: row.name,
      category: row.category,
      detail: row.detail ?? "",
    }))
  }
  if (source.initial_reporter_category || source.initial_reporter_detail) {
    return [{
      name: "",
      category: source.initial_reporter_category ?? "",
      detail: source.initial_reporter_detail ?? "",
    }]
  }
  return []
}

export function createInitialReporter(): InitialReporterFormRow {
  return { name: "", category: "", detail: "" }
}

export function initialReportersToForm(source: ReporterSource): InitialReporterFormRow[] {
  const rows = normalizeInitialReporters(source)
  if (!rows.length) return [createInitialReporter()]
  return rows.map((row) => ({
    ...row,
    ...(rows.length === 1 && !row.name.trim() ? { legacy: true } : {}),
  }))
}

export function isNamelessLegacyReporter(rows: InitialReporterFormRow[]): boolean {
  return rows.length === 1 && rows[0]?.legacy === true && !rows[0].name.trim()
}

export function initialReportersPayload(rows: InitialReporterFormRow[]) {
  const reporters = rows.map(({ name, category, detail }) => ({ name, category, detail }))
  return {
    // Preserve old scalar-only records without presenting a nameless row as new API input.
    ...(isNamelessLegacyReporter(rows) ? {} : { initial_reporters: reporters }),
    initial_reporter_category: reporters[0]?.category || null,
    initial_reporter_detail: reporters[0]?.detail || null,
  }
}
