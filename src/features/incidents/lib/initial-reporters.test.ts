import { describe, expect, it } from "vitest"
import { createInitialReporter, initialReportersPayload, initialReportersToForm, normalizeInitialReporters } from "./initial-reporters"
import { initialReporterSchema, initialReportersSchema, incidentFormSchema } from "../schemas/incident-form-schema"

const legacy = { initial_reporter_category: "Karyawan: Perawat", initial_reporter_detail: "Tim malam" }
const reporters = [
  { name: "Ana", category: "Karyawan: Perawat", detail: "" },
  { name: "Budi", category: "Pengunjung", detail: "Saksi" },
  { name: "Citra", category: "Pasien", detail: "" },
]
const firstReporter = { name: "Ana", category: "Karyawan: Perawat", detail: "" }

describe("initial reporters", () => {
  it("normalizes arrays and JSON without truncation or leaking extra fields", () => {
    expect(normalizeInitialReporters({ ...legacy, initial_reporters: reporters })).toEqual(reporters)
    expect(normalizeInitialReporters({ ...legacy, initial_reporters: JSON.stringify(reporters) })).toEqual(reporters)
    expect(normalizeInitialReporters({ ...legacy, initial_reporters: JSON.stringify([{ ...reporters[0], legacy: true }]) })).toEqual([reporters[0]])
  })

  it.each([undefined, null, "{invalid", "{}", '[null]', '[{"name":12}]'])("falls back safely for %s", (raw) => {
    const source = { ...legacy, ...(raw === undefined ? {} : { initial_reporters: raw }) }
    expect(normalizeInitialReporters(source)).toEqual([{ name: "", category: legacy.initial_reporter_category, detail: legacy.initial_reporter_detail }])
  })

  it("preserves explicit empty arrays and supports null/absent optional details", () => {
    expect(normalizeInitialReporters({ ...legacy, initial_reporters: "[]" })).toEqual([])
    expect(normalizeInitialReporters({ ...legacy, initial_reporters: '[{"name":"Ana","category":"Pasien","detail":null}]' })).toEqual([{ name: "Ana", category: "Pasien", detail: "" }])
    expect(normalizeInitialReporters({ initial_reporter_category: null, initial_reporter_detail: null })).toEqual([])
  })

  it("preserves a nameless legacy row without exempting new rows", () => {
    const rows = initialReportersToForm(legacy)
    expect(rows[0]?.legacy).toBe(true)
    expect(initialReportersSchema.safeParse(rows).success).toBe(true)
    expect(initialReporterSchema.safeParse(createInitialReporter()).success).toBe(false)
    expect(initialReportersToForm({ ...legacy, initial_reporters: reporters }).every((row) => !row.legacy)).toBe(true)
    expect(initialReportersToForm({ ...legacy, initial_reporters: [{ name: "", category: "Pasien", detail: "" }] })[0]?.legacy).toBe(true)
  })

  it("requires each new identity/category, keeps detail optional, and reports nested paths", () => {
    expect(initialReporterSchema.safeParse({ name: "Ana", category: "Pasien", detail: "" }).success).toBe(true)
    const result = incidentFormSchema.safeParse({ initial_reporters: [...reporters, { name: "  ", category: "  ", detail: "" }] })
    expect(result.success).toBe(false)
    if (!result.success) {
      const reporterIssues = result.error.issues.filter((issue) => issue.path[0] === "initial_reporters")
      expect(reporterIssues.map((issue) => issue.path.join("."))).toEqual(expect.arrayContaining(["initial_reporters.3.name", "initial_reporters.3.category"]))
    }
  })

  it("creates independent add rows and sends only the contract, keeping legacy scalars in sync", () => {
    const first = createInitialReporter()
    const second = createInitialReporter()
    first.name = "Changed"
    expect(second.name).toBe("")
    expect(initialReportersPayload([{ ...firstReporter, legacy: true }, ...reporters.slice(1)])).toEqual({
      initial_reporters: reporters,
      initial_reporter_category: reporters[0]?.category,
      initial_reporter_detail: null,
    })
  })

  it("omits the array for a single nameless legacy row, including whitespace, and never sends provenance", () => {
    for (const name of ["", "  "]) {
      const payload = initialReportersPayload([{ name, category: "PETUGAS", detail: "Tim lama", legacy: true }])
      expect(payload).toEqual({ initial_reporter_category: "PETUGAS", initial_reporter_detail: "Tim lama" })
      expect(Object.hasOwn(payload, "initial_reporters")).toBe(false)
      expect(JSON.stringify(payload)).not.toContain("legacy")
    }
    expect(initialReportersPayload([createInitialReporter()])).toHaveProperty("initial_reporters")
  })

  it("requires every name in multiple rows even if a legacy row remains", () => {
    const rows = initialReportersToForm(legacy)
    const mixed = [...rows, { name: "Budi", category: "Pengunjung", detail: "" }]
    expect(initialReportersPayload(mixed).initial_reporters).toHaveLength(2)
    const result = initialReportersSchema.safeParse(mixed)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path)).toContainEqual([0, "name"])
    expect(initialReportersSchema.safeParse([{ ...rows[0], name: "Ana" }, mixed[1]]).success).toBe(true)
    expect(initialReportersSchema.safeParse(rows).success).toBe(true)
  })

  it("sends a named former legacy row as an array without metadata", () => {
    const rows = [{ name: "Ana", category: legacy.initial_reporter_category, detail: legacy.initial_reporter_detail, legacy: true }]
    expect(initialReportersPayload(rows)).toEqual({
      initial_reporters: [{ name: "Ana", category: legacy.initial_reporter_category, detail: legacy.initial_reporter_detail }],
      initial_reporter_category: legacy.initial_reporter_category,
      initial_reporter_detail: legacy.initial_reporter_detail,
    })
    expect(initialReportersSchema.safeParse(rows).success).toBe(true)
  })
})
