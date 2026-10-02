import type { AuthenticatedUser } from "./session"

export type UserRole = "TENAGA_KESEHATAN" | "KEPALA_RUANGAN" | "KOMITE_PMKP" | "ADMINISTRATOR"

export type IncidentStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVISION_REQUIRED"
  | "UNDER_REVIEW"
  | "SIMPLE_INVESTIGATION"
  | "PMKP_REVIEW"
  | "COMPLETED_BY_UNIT"
  | "COMPLETED"

export interface IncidentReportSummary {
  id: string
  status: IncidentStatus
  created_by_user_id: string
  owning_unit_id: string
  pmkp_reviewed?: number | boolean | null
}

export function canCreateDraft(user: AuthenticatedUser): boolean {
  if (!user.isActive) {
    return false
  }
  // Nakes, Kepala Ruangan, PMKP can create draft. Administrator cannot.
  return (
    user.role === "TENAGA_KESEHATAN" ||
    user.role === "KEPALA_RUANGAN" ||
    user.role === "KOMITE_PMKP"
  )
}

export function canReadReport(user: AuthenticatedUser, report: IncidentReportSummary): boolean {
  if (!user.isActive) {
    return false
  }

  // Administrator needs access to every report status for lifecycle administration.
  // Clinical fields remain protected by sanitizeReportForUser.
  if (user.role === "ADMINISTRATOR") {
    return true
  }

  // Drafts are strictly private to created_by
  if (report.status === "DRAFT") {
    return report.created_by_user_id === user.id
  }

  // Non-draft submitted reports: Nakes IBS can view other Nakes IBS reports (read-only)
  // Administrators can view administrative metadata, but clinical narrative is stripped
  if (report.owning_unit_id === "IBS") {
    return true
  }

  return false
}

export function canEditDraft(user: AuthenticatedUser, report: IncidentReportSummary): boolean {
  if (!user.isActive) {
    return false
  }
  return (
    (report.status === "DRAFT" || report.status === "REVISION_REQUIRED") &&
    report.created_by_user_id === user.id
  )
}

export function canDeleteDraft(user: AuthenticatedUser, report: IncidentReportSummary): boolean {
  if (!user.isActive) {
    return false
  }
  if (user.role === "ADMINISTRATOR") {
    return true
  }
  return report.status === "DRAFT" && report.created_by_user_id === user.id
}

export function canSubmitReport(user: AuthenticatedUser, report: IncidentReportSummary): boolean {
  if (!user.isActive) {
    return false
  }
  return (
    (report.status === "DRAFT" || report.status === "REVISION_REQUIRED") &&
    report.created_by_user_id === user.id
  )
}

export function canReceiveReport(user: AuthenticatedUser, report: IncidentReportSummary): boolean {
  if (!user.isActive) {
    return false
  }
  return (
    user.role === "KEPALA_RUANGAN" &&
    report.status === "SUBMITTED" &&
    report.owning_unit_id === "IBS"
  )
}

export function canRequestRevision(
  user: AuthenticatedUser,
  report: IncidentReportSummary,
): boolean {
  if (!user.isActive) {
    return false
  }
  return (
    user.role === "KEPALA_RUANGAN" &&
    (report.status === "SUBMITTED" || report.status === "UNDER_REVIEW") &&
    report.owning_unit_id === "IBS"
  )
}

export function canAssignRiskGrade(
  user: AuthenticatedUser,
  report: IncidentReportSummary & { risk_grade?: string | null },
): boolean {
  if (!user.isActive) {
    return false
  }
  // risk_grade must be null: re-grading after a grade is already set is rejected.
  return (
    user.role === "KEPALA_RUANGAN" &&
    report.status === "UNDER_REVIEW" &&
    report.owning_unit_id === "IBS" &&
    (report.risk_grade === null || report.risk_grade === undefined)
  )
}

export function canEmergencyCorrect(
  user: AuthenticatedUser,
  report: IncidentReportSummary,
): boolean {
  if (!user.isActive) {
    return false
  }
  // Actor: strictly Kepala Ruangan IBS. Allowed ONLY during SUBMITTED or UNDER_REVIEW.
  // Forbidden after SIMPLE_INVESTIGATION, PMKP_REVIEW, COMPLETED_BY_UNIT, COMPLETED.
  return (
    user.role === "KEPALA_RUANGAN" &&
    (report.status === "SUBMITTED" || report.status === "UNDER_REVIEW") &&
    report.owning_unit_id === "IBS"
  )
}

export function canFillSimpleInvestigation(
  user: AuthenticatedUser,
  report: IncidentReportSummary,
): boolean {
  if (!user.isActive) {
    return false
  }
  return (
    user.role === "KEPALA_RUANGAN" &&
    report.status === "SIMPLE_INVESTIGATION" &&
    report.owning_unit_id === "IBS"
  )
}

export function canCompleteSimpleInvestigation(
  user: AuthenticatedUser,
  report: IncidentReportSummary,
): boolean {
  if (!user.isActive) {
    return false
  }
  return (
    user.role === "KEPALA_RUANGAN" &&
    report.status === "SIMPLE_INVESTIGATION" &&
    report.owning_unit_id === "IBS"
  )
}

/**
 * Kepala Ruangan IBS may start a simple investigation for BIRU/HIJAU incidents
 * that are still UNDER_REVIEW (i.e. grade was assigned but investigation not yet opened).
 */
export function canStartSimpleInvestigation(
  user: AuthenticatedUser,
  report: IncidentReportSummary & { risk_grade?: string | null },
): boolean {
  if (!user.isActive) {
    return false
  }
  return (
    user.role === "KEPALA_RUANGAN" &&
    report.status === "UNDER_REVIEW" &&
    report.owning_unit_id === "IBS" &&
    (report.risk_grade === "BIRU" || report.risk_grade === "HIJAU")
  )
}

/**
 * Kepala Ruangan IBS may skip simple investigation and complete directly for
 * BIRU/HIJAU incidents still in UNDER_REVIEW (no investigation record required).
 */
export function canSkipToCompleted(
  user: AuthenticatedUser,
  report: IncidentReportSummary & { risk_grade?: string | null },
): boolean {
  if (!user.isActive) {
    return false
  }
  return (
    user.role === "KEPALA_RUANGAN" &&
    report.status === "UNDER_REVIEW" &&
    report.owning_unit_id === "IBS" &&
    (report.risk_grade === "BIRU" || report.risk_grade === "HIJAU")
  )
}

export function canUpdatePmkpReview(
  user: AuthenticatedUser,
  report: IncidentReportSummary,
): boolean {
  if (!user.isActive) {
    return false
  }
  return (
    user.role === "KOMITE_PMKP" &&
    report.status === "PMKP_REVIEW" &&
    !report.pmkp_reviewed &&
    report.owning_unit_id === "IBS"
  )
}

export function canFinalizeRcaHandoff(
  user: AuthenticatedUser,
  report: IncidentReportSummary,
): boolean {
  if (!user.isActive) {
    return false
  }
  return (
    (user.role === "KOMITE_PMKP" || user.role === "KEPALA_RUANGAN") &&
    report.status === "PMKP_REVIEW" &&
    report.owning_unit_id === "IBS"
  )
}

export function canManageUsers(user: AuthenticatedUser): boolean {
  return user.isActive && user.role === "ADMINISTRATOR"
}

export function canManageMasterData(user: AuthenticatedUser): boolean {
  return user.isActive && user.role === "ADMINISTRATOR"
}

/**
 * Strips clinical narrative and patient identifiers if user is administrator
 * to enforce clinical privacy boundaries.
 */
export function sanitizeReportForUser<T extends Record<string, unknown>>(
  user: AuthenticatedUser,
  report: T,
): T {
  if (user.role === "ADMINISTRATOR") {
    const sanitized = { ...report }
    delete sanitized.patient_name
    delete sanitized.medical_record_number
    delete sanitized.chronology
    delete sanitized.immediate_action_and_result
    delete sanitized.high_risk_mitigation_notes
    delete sanitized.direct_cause
    delete sanitized.underlying_root_cause
    return sanitized
  }
  return report
}
