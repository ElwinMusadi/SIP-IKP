// @vitest-environment happy-dom

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { SeverityReference } from "./severity-reference"

const expectedLevels = [
  { level: 1, name: "Tidak signifikan", color: "risk-blue", descriptions: ["Tidak ada cedera."] },
  { level: 2, name: "Minor", color: "risk-green", descriptions: [
    "Cedera ringan, misalnya luka lecet.",
    "Dapat diatasi dengan pertolongan pertama.",
  ] },
  { level: 3, name: "Moderat", color: "risk-yellow", descriptions: [
    "Cedera sedang, misalnya luka robek.",
    "Berkurangnya fungsi motorik/sensorik/psikologis atau intelektual (reversibel), tidak berhubungan dengan penyakit.",
    "Setiap kasus yang memperpanjang perawatan.",
  ] },
  { level: 4, name: "Mayor", color: "severity-orange", descriptions: [
    "Cedera luas/berat, misalnya cacat, lumpuh.",
    "Kehilangan fungsi motorik/sensorik/psikologis atau intelektual (irreversibel), tidak berhubungan dengan penyakit.",
  ] },
  { level: 5, name: "Katastropik", color: "risk-red", descriptions: [
    "Kematian yang tidak berhubungan dengan perjalanan penyakit.",
  ] },
] as const

function renderReference() {
  const container = document.createElement("div")
  container.innerHTML = renderToStaticMarkup(<SeverityReference />)
  return container
}

describe("SeverityReference", () => {
  it("colors all five desktop rows and keeps their backgrounds on hover", () => {
    const container = renderReference()
    const rows = Array.from(container.querySelectorAll("tbody > tr"))
    expect(rows).toHaveLength(5)
    expect(container.querySelector("table")?.parentElement?.parentElement?.classList.contains("md:block")).toBe(true)

    expectedLevels.forEach((expected, index) => {
      const row = rows[index]
      if (!row) throw new Error(`Missing desktop severity level ${expected.level.toString()}`)
      expect(row.classList.contains(`bg-${expected.color}`)).toBe(true)
      expect(row.classList.contains(`text-${expected.color}-foreground`)).toBe(true)
      expect(row.classList.contains(`hover:bg-${expected.color}`)).toBe(true)
      expect(row.className).not.toMatch(/(?:^|\s)hover:bg-muted(?:\/\d+)?(?:\s|$)/)
      const cells = Array.from(row.querySelectorAll("td"))
      expect(cells).toHaveLength(3)
      expect(cells[0]?.textContent).toBe(expected.level.toString())
      expect(cells[1]?.textContent).toBe(expected.name)
      expect(Array.from(row.querySelectorAll("li"), (item) => item.textContent)).toEqual(expected.descriptions)
    })
  })

  it("uses the same five full-card colors and complete content on mobile", () => {
    const container = renderReference()
    const list = container.querySelector('ol[aria-label="Tingkat dampak klinis"]')
    expect(list?.classList.contains("md:hidden")).toBe(true)
    const cards = Array.from(container.querySelectorAll("ol > li"))
    expect(cards).toHaveLength(5)

    expectedLevels.forEach((expected, index) => {
      const card = cards[index]
      if (!card) throw new Error(`Missing mobile severity level ${expected.level.toString()}`)
      expect(card.classList.contains(`bg-${expected.color}`)).toBe(true)
      expect(card.classList.contains(`text-${expected.color}-foreground`)).toBe(true)
      expect(card.classList.contains(`hover:bg-${expected.color}`)).toBe(true)
      expect(card.className).not.toContain("hover:bg-muted")
      expect(card.querySelector("h5")?.textContent).toBe(`${expected.level.toString()}. ${expected.name}`)
      expect(Array.from(card.querySelectorAll("ul > li"), (item) => item.textContent)).toEqual(expected.descriptions)
    })
  })

  it("preserves the reference-only explanation, headings, and noninteractive content", () => {
    const container = renderReference()
    expect(container.querySelector("section")?.getAttribute("aria-labelledby")).toBe("severity-reference-title")
    expect(container.querySelector("h4")?.textContent).toBe("Referensi Penilaian Dampak Klinis (Severity)")
    expect(container.querySelector("p")?.textContent).toBe(
      "Gunakan informasi berikut sebagai referensi dalam menentukan pita grading risiko. Tingkat severity tidak otomatis menentukan pita grading risiko; penetapan risiko tetap dilakukan oleh Kepala Ruangan.",
    )
    expect(Array.from(container.querySelectorAll("th"), (heading) => heading.textContent)).toEqual([
      "Tingkat Risiko", "Deskripsi", "Dampak",
    ])
    expect(container.querySelector("input, select, button, form")).toBeNull()
  })
})
