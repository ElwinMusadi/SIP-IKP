import { describe, expect, it } from "vitest"

import { buildIncidentPdfFilename, sanitizePdfFilenamePart } from "./pdf-filename"

describe("incident PDF filename helpers", () => {
  it("replaces path separators and unsafe filename characters", () => {
    expect(sanitizePdfFilenamePart("IKP/2026: 001?*")).toBe("IKP-2026-001")
  })

  it("uses the report ID when the report number is empty", () => {
    expect(buildIncidentPdfFilename(" ", "incident/42")).toBe("Formulir-IKP-incident-42.pdf")
  })

  it("uses a stable fallback when both identifiers are unavailable", () => {
    expect(buildIncidentPdfFilename(undefined, undefined)).toBe("Formulir-IKP-laporan.pdf")
  })
})
