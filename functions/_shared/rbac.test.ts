import { describe, expect, it } from "vitest"

import type { AuthenticatedUser } from "./session"
import {
  canAssignRiskGrade,
  canCompleteSimpleInvestigation,
  canCreateDraft,
  canDeleteDraft,
  canEditDraft,
  canEmergencyCorrect,
  canFinalizeRcaHandoff,
  canReadReport,
  canReceiveReport,
  canRequestRevision,
  canSubmitReport,
  canUpdatePmkpReview,
  sanitizeReportForUser,
} from "./rbac"

const nakesUser: AuthenticatedUser = {
  id: "usr_nakes",
  username: "nakes_1",
  fullName: "Ns. Maria",
  role: "TENAGA_KESEHATAN",
  profession: "Perawat Bedah",
  unitId: "IBS",
  isActive: true,
}

const otherNakesUser: AuthenticatedUser = {
  id: "usr_nakes_2",
  username: "nakes_2",
  fullName: "Ns. Anton",
  role: "TENAGA_KESEHATAN",
  profession: "Perawat Bedah",
  unitId: "IBS",
  isActive: true,
}

const headroomUser: AuthenticatedUser = {
  id: "usr_headroom",
  username: "headroom_1",
  fullName: "Ns. Yohanes",
  role: "KEPALA_RUANGAN",
  profession: "Kepala Ruangan",
  unitId: "IBS",
  isActive: true,
}

const pmkpUser: AuthenticatedUser = {
  id: "usr_pmkp",
  username: "pmkp_1",
  fullName: "dr. Robertus",
  role: "KOMITE_PMKP",
  profession: "Komite PMKP",
  unitId: "IBS",
  isActive: true,
}

const adminUser: AuthenticatedUser = {
  id: "usr_admin",
  username: "admin_1",
  fullName: "Admin",
  role: "ADMINISTRATOR",
  profession: "Admin",
  unitId: "IBS",
  isActive: true,
}

describe("RBAC foundation policy functions", () => {
  it("allows Nakes, Kepala Ruangan, and PMKP to create drafts, but denies Administrator", () => {
    expect(canCreateDraft(nakesUser)).toBe(true)
    expect(canCreateDraft(headroomUser)).toBe(true)
    expect(canCreateDraft(pmkpUser)).toBe(true)
    expect(canCreateDraft(adminUser)).toBe(false)
  })

  it("enforces strict privacy on drafts: only created_by can read draft", () => {
    const draftReport = {
      id: "inc_01",
      status: "DRAFT" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }

    expect(canReadReport(nakesUser, draftReport)).toBe(true)
    expect(canReadReport(otherNakesUser, draftReport)).toBe(false)
    expect(canReadReport(headroomUser, draftReport)).toBe(false)
    expect(canReadReport(pmkpUser, draftReport)).toBe(false)
  })

  it("allows Nakes IBS to read submitted peer reports from other Nakes IBS", () => {
    const submittedReport = {
      id: "inc_02",
      status: "SUBMITTED" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }

    expect(canReadReport(otherNakesUser, submittedReport)).toBe(true)
    expect(canReadReport(headroomUser, submittedReport)).toBe(true)
    expect(canReadReport(pmkpUser, submittedReport)).toBe(true)
  })

  it("permits only created_by to edit, delete, and submit draft", () => {
    const draftReport = {
      id: "inc_01",
      status: "DRAFT" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }

    expect(canEditDraft(nakesUser, draftReport)).toBe(true)
    expect(canEditDraft(otherNakesUser, draftReport)).toBe(false)
    expect(canDeleteDraft(nakesUser, draftReport)).toBe(true)
    expect(canDeleteDraft(headroomUser, draftReport)).toBe(false)
    expect(canSubmitReport(nakesUser, draftReport)).toBe(true)
    expect(canSubmitReport(otherNakesUser, draftReport)).toBe(false)
  })

  it("enforces Kepala Ruangan review and grading lifecycle", () => {
    const submitted = {
      id: "inc_03",
      status: "SUBMITTED" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }
    const underReview = {
      id: "inc_03",
      status: "UNDER_REVIEW" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }

    expect(canReceiveReport(headroomUser, submitted)).toBe(true)
    expect(canReceiveReport(nakesUser, submitted)).toBe(false)

    expect(canRequestRevision(headroomUser, underReview)).toBe(true)
    expect(canAssignRiskGrade(headroomUser, underReview)).toBe(true)
    expect(canAssignRiskGrade(nakesUser, underReview)).toBe(false)
  })

  it("enforces Emergency Correction temporal boundaries strictly", () => {
    const submitted = {
      id: "inc_01",
      status: "SUBMITTED" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }
    const underReview = {
      id: "inc_01",
      status: "UNDER_REVIEW" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }
    const simpleInv = {
      id: "inc_01",
      status: "SIMPLE_INVESTIGATION" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }
    const pmkpReview = {
      id: "inc_01",
      status: "PMKP_REVIEW" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }
    const completed = {
      id: "inc_01",
      status: "COMPLETED" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }

    // Allowed ONLY during SUBMITTED or UNDER_REVIEW by Kepala Ruangan
    expect(canEmergencyCorrect(headroomUser, submitted)).toBe(true)
    expect(canEmergencyCorrect(headroomUser, underReview)).toBe(true)

    // Strictly FORBIDDEN during SIMPLE_INVESTIGATION, PMKP_REVIEW, COMPLETED
    expect(canEmergencyCorrect(headroomUser, simpleInv)).toBe(false)
    expect(canEmergencyCorrect(headroomUser, pmkpReview)).toBe(false)
    expect(canEmergencyCorrect(headroomUser, completed)).toBe(false)

    // Other roles always denied
    expect(canEmergencyCorrect(nakesUser, submitted)).toBe(false)
    expect(canEmergencyCorrect(pmkpUser, submitted)).toBe(false)
  })

  it("enforces Simple Investigation completion by Kepala Ruangan", () => {
    const simpleInv = {
      id: "inc_01",
      status: "SIMPLE_INVESTIGATION" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
    }
    expect(canCompleteSimpleInvestigation(headroomUser, simpleInv)).toBe(true)
    expect(canCompleteSimpleInvestigation(nakesUser, simpleInv)).toBe(false)
    expect(canCompleteSimpleInvestigation(pmkpUser, simpleInv)).toBe(false)
  })

  it("enforces PMKP review and finalization authority", () => {
    const pmkpReviewOpen = {
      id: "inc_01",
      status: "PMKP_REVIEW" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
      pmkp_reviewed: 0,
    }
    const pmkpReviewClosed = {
      id: "inc_01",
      status: "PMKP_REVIEW" as const,
      created_by_user_id: "usr_nakes",
      owning_unit_id: "IBS",
      pmkp_reviewed: 1,
    }

    expect(canUpdatePmkpReview(pmkpUser, pmkpReviewOpen)).toBe(true)
    expect(canUpdatePmkpReview(pmkpUser, pmkpReviewClosed)).toBe(false)

    // Both PMKP and Kepala Ruangan can finalize RCA handoff
    expect(canFinalizeRcaHandoff(pmkpUser, pmkpReviewOpen)).toBe(true)
    expect(canFinalizeRcaHandoff(headroomUser, pmkpReviewOpen)).toBe(true)
    expect(canFinalizeRcaHandoff(nakesUser, pmkpReviewOpen)).toBe(false)
  })

  it("strips clinical narrative fields for administrator to protect patient privacy", () => {
    const report = {
      id: "inc_01",
      report_number: "IKP/IBS/202609/0001",
      status: "SUBMITTED",
      patient_name: "PATIENT X",
      medical_record_number: "MR-999",
      chronology: "Confidential clinical narrative",
      immediate_action_and_result: "Stabilized",
      owning_unit_id: "IBS",
    }

    const sanitized = sanitizeReportForUser(adminUser, report)
    expect(sanitized.patient_name).toBeUndefined()
    expect(sanitized.medical_record_number).toBeUndefined()
    expect(sanitized.chronology).toBeUndefined()
    expect(sanitized.report_number).toBe("IKP/IBS/202609/0001")

    // Nakes receives unsanitized clinical report
    const nakesView = sanitizeReportForUser(nakesUser, report)
    expect(nakesView.patient_name).toBe("PATIENT X")
  })
})
