const DEFAULT_REPORT_IDENTIFIER = "laporan"
const MAX_IDENTIFIER_LENGTH = 80

export function sanitizePdfFilenamePart(value: string | null | undefined): string {
  const sanitized = (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, MAX_IDENTIFIER_LENGTH)
    .replace(/[-_]+$/g, "")

  return sanitized || DEFAULT_REPORT_IDENTIFIER
}

export function buildIncidentPdfFilename(
  reportNumber: string | null | undefined,
  reportId: string | null | undefined,
): string {
  const identifier = reportNumber?.trim() || reportId?.trim() || DEFAULT_REPORT_IDENTIFIER

  return `Formulir-IKP-${sanitizePdfFilenamePart(identifier)}.pdf`
}
