import { describe, expect, it, vi } from "vitest"

import { parsePrintTableRows } from "./print-formatters"

describe("parsePrintTableRows", () => {
  it("parses serialized table rows", () => {
    expect(parsePrintTableRows<{ text: string }>(' [{"text":"Cek ulang"}] ', "actions")).toEqual([
      { text: "Cek ulang" },
    ])
  })

  it("warns without exposing source data when JSON is invalid", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    expect(parsePrintTableRows("rahasia-{", "recommendations")).toEqual([])
    expect(warning).toHaveBeenCalledWith(
      "Data tabel cetak recommendations tidak valid; menggunakan daftar kosong.",
    )
    expect(warning.mock.calls.flat().join(" ")).not.toContain("rahasia")

    warning.mockRestore()
  })
})
