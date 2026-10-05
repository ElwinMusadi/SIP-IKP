import { describe, expect, it } from "vitest"

const sources = import.meta.glob<string>("../**/*.{ts,tsx}", {
  query: "?raw", import: "default", eager: true,
})

describe("severity reference isolation", () => {
  it("keeps reference content local and imports it only in the HeadRoom review panel", () => {
    const productionSources = Object.entries(sources).filter(([path]) => !path.includes(".test."))
    const consumers = productionSources.filter(([path, source]) =>
      !path.endsWith("/severity-reference.tsx") && /severity-reference|severityLevels|SeverityReference/.test(source),
    )
    expect(consumers.map(([path]) => path)).toEqual(["../components/head-room-review-panel.tsx"])
    for (const file of [
      "incident-pdf-document.tsx", "incident-print-page.tsx",
      "incident-create-page.tsx", "initial-reporters.ts", "incident.ts",
    ]) {
      const source = productionSources.find(([path]) => path.endsWith(`/${file}`))?.[1]
      expect(source).toBeDefined()
      expect(source).not.toMatch(/severity-reference|severityLevels|Katastropik|Referensi Penilaian Dampak Klinis/)
    }
  })
})
