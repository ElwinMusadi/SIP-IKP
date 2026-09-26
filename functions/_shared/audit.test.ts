import { describe, expect, it } from "vitest"

import { ALLOWED_AUDIT_EVENTS, createAuditPreparedStatement, isValidAuditEventType } from "./audit"

describe("audit foundation", () => {
  it("allows only the minimal 7 approved audit event types", () => {
    expect(ALLOWED_AUDIT_EVENTS).toEqual([
      "DRAFT_CREATED",
      "REPORT_SUBMITTED",
      "REVISION_REQUIRED",
      "SIMPLE_INVESTIGATION_COMPLETED",
      "REPORT_COMPLETED",
      "EMERGENCY_CORRECTION",
    ])

    expect(isValidAuditEventType("REPORT_SUBMITTED")).toBe(true)
    expect(isValidAuditEventType("EMERGENCY_CORRECTION")).toBe(true)
    expect(isValidAuditEventType("RISK_GRADE_CHANGED")).toBe(false)
    expect(isValidAuditEventType("REPORT_RESUBMITTED")).toBe(false)
    expect(isValidAuditEventType("ADDENDUM_CREATED")).toBe(false)
  })

  it("throws error when creating prepared statement with unauthorized event", () => {
    const fakeDb = {
      prepare: () => ({
        bind: () => ({}),
      }),
    } as unknown as D1Database

    expect(() =>
      createAuditPreparedStatement(fakeDb, {
        incidentId: "inc_01",
        eventType: "UNAUTHORIZED_EVENT" as unknown as (typeof ALLOWED_AUDIT_EVENTS)[number],
        actor: { id: "usr_01", fullName: "User 1", role: "TENAGA_KESEHATAN" },
        requestId: "req_01",
      }),
    ).toThrow(/Unauthorized audit event type/)
  })
})
