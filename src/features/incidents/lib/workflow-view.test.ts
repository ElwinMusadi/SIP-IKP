import { describe, expect, it } from "vitest"

import type { IncidentReport } from "../types/incident"
import {
  needsInvestigationDecision,
  showsInvestigationWorksheet,
  showsRiskGrading,
} from "./workflow-view"

function report(overrides: Partial<IncidentReport>): IncidentReport {
  return overrides as IncidentReport
}

describe("incident workflow presentation", () => {
  it.each(["BIRU", "HIJAU"] as const)(
    "shows the investigation decision, not grading, after %s is stored",
    (riskGrade) => {
      const value = report({ status: "UNDER_REVIEW", risk_grade: riskGrade })

      expect(needsInvestigationDecision(value)).toBe(true)
      expect(showsRiskGrading(value)).toBe(false)
    },
  )

  it("keeps grading available before a grade is assigned", () => {
    const value = report({ status: "UNDER_REVIEW", risk_grade: null })

    expect(needsInvestigationDecision(value)).toBe(false)
    expect(showsRiskGrading(value)).toBe(true)
  })

  it("does not show an empty worksheet after investigation is skipped", () => {
    expect(
      showsInvestigationWorksheet(report({ status: "COMPLETED_BY_UNIT", investigation: null })),
    ).toBe(false)
  })

  it("keeps completed investigated reports visible", () => {
    expect(
      showsInvestigationWorksheet(
        report({ status: "COMPLETED_BY_UNIT", investigation: { id: "inv-1" } as never }),
      ),
    ).toBe(true)
  })
})
