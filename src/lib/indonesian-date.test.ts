import { describe, expect, it } from "vitest"

import {
  formatBackendDate,
  formatBackendDateTime,
  maskIndonesianDate,
  parseIndonesianDate,
  parseIndonesianDateTime,
} from "./indonesian-date"

describe("Indonesian date helpers", () => {
  it("converts strict Indonesian dates to backend dates", () => {
    expect(parseIndonesianDate("29/02/2024")).toBe("2024-02-29")
    expect(parseIndonesianDate("29/02/2023")).toBeNull()
    expect(parseIndonesianDate("31/04/2026")).toBeNull()
    expect(parseIndonesianDate("1/2/2026")).toBe("2026-02-01")
    expect(parseIndonesianDate("01/2/2026")).toBe("2026-02-01")
    expect(parseIndonesianDate("29/09/202")).toBeNull()
  })

  it("converts strict Indonesian date-times without changing local time", () => {
    expect(parseIndonesianDateTime("29/09/2026 17:42")).toBe("2026-09-29T17:42")
    expect(parseIndonesianDateTime("29/09/2026 24:00")).toBeNull()
    expect(parseIndonesianDateTime("1/2/2026 3:04")).toBe("2026-02-01T03:04")
    expect(parseIndonesianDateTime("01/02/2026 3:4")).toBe("2026-02-01T03:04")
  })

  it("formats backend contracts for display", () => {
    expect(formatBackendDate("2026-09-29")).toBe("29/09/2026")
    expect(formatBackendDateTime("2026-09-29T17:42:00.000Z")).toBe("29/09/2026 17:42")
  })

  it("masks typed digits", () => {
    expect(maskIndonesianDate("29092026")).toBe("29/09/2026")
    expect(maskIndonesianDate("290920261742", true)).toBe("29/09/2026 17:42")
    expect(maskIndonesianDate("1/2/2026")).toBe("1/2/2026")
    expect(maskIndonesianDate("1/2/2026 3:04", true)).toBe("1/2/2026 3:04")
    expect(maskIndonesianDate("29/092")).toBe("29/09/2")
    expect(maskIndonesianDate("29/09/20261", true)).toBe("29/09/2026 1")
  })
})
