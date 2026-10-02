import type { IncidentReport } from "../types/incident"

export function needsInvestigationDecision(report: IncidentReport): boolean {
  return (
    report.status === "UNDER_REVIEW" &&
    (report.risk_grade === "BIRU" || report.risk_grade === "HIJAU")
  )
}

export function showsRiskGrading(report: IncidentReport): boolean {
  return report.status === "UNDER_REVIEW" && !needsInvestigationDecision(report)
}

export function showsInvestigationWorksheet(report: IncidentReport): boolean {
  return (
    report.status === "SIMPLE_INVESTIGATION" ||
    (report.status === "COMPLETED_BY_UNIT" && Boolean(report.investigation))
  )
}
