import { describe, expect, it } from "vitest"

import { createSafeLogRecord, redactForLogging } from "./log-redaction"

describe("baseline application log redaction", () => {
  it("redacts credentials and authentication material", () => {
    expect(
      redactForLogging({
        password: "not-for-logs",
        sessionToken: "session-secret",
        csrfToken: "csrf-secret",
        authorization: "Bearer secret",
        cookie: "session=secret",
      }),
    ).toEqual({
      password: "[REDACTED]",
      sessionToken: "[REDACTED]",
      csrfToken: "[REDACTED]",
      authorization: "[REDACTED]",
      cookie: "[REDACTED]",
    })
  })

  it("redacts patient and incident-sensitive values recursively", () => {
    expect(
      redactForLogging({
        patient: {
          patientName: "PATIENT-TEST-001",
          medicalRecordNumber: "MR-TEST-001",
          chronology: "SYNTHETIC INCIDENT NARRATIVE",
          immediateActionAndResult: "Tindakan stabilisasi darurat",
          highRiskMitigationNotes: "Mitigasi awal",
          directCause: "Penyebab langsung",
          underlyingRootCause: "Akar masalah",
        },
        attachment: {
          objectKey: "private/test-object",
        },
      }),
    ).toEqual({
      patient: {
        patientName: "[REDACTED]",
        medicalRecordNumber: "[REDACTED]",
        chronology: "[REDACTED]",
        immediateActionAndResult: "[REDACTED]",
        highRiskMitigationNotes: "[REDACTED]",
        directCause: "[REDACTED]",
        underlyingRootCause: "[REDACTED]",
      },
      attachment: {
        objectKey: "[REDACTED]",
      },
    })
  })

  it("creates deterministic safe log metadata with an injected clock", () => {
    expect(
      createSafeLogRecord(
        "request.completed",
        "request-01",
        { password: "secret", status: 200 },
        () => new Date("2026-09-26T08:00:00.000Z"),
      ),
    ).toEqual({
      event: "request.completed",
      requestId: "request-01",
      timestamp: "2026-09-26T08:00:00.000Z",
      password: "[REDACTED]",
      status: 200,
    })
  })
})
