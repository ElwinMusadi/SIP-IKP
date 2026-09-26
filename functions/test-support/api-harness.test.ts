import { describe, expect, it } from "vitest"

import {
  candidateConcurrencyProblems,
  createApiHarnessResponse,
  expectJsonResponse,
} from "./api-harness"

describe("API test harness", () => {
  it("asserts status, JSON body, and request ID propagation", async () => {
    const response = createApiHarnessResponse({
      requestId: "test-request-id",
      body: { status: "ok", requestId: "test-request-id" },
    })

    await expectJsonResponse(response, {
      status: 200,
      requestId: "test-request-id",
      body: { status: "ok", requestId: "test-request-id" },
    })
  })

  it("provides candidate concurrency expectations without business behavior", () => {
    expect(candidateConcurrencyProblems).toEqual({
      missingPrecondition: { status: 428, code: "PRECONDITION_REQUIRED" },
      staleEtag: { status: 412, code: "PRECONDITION_FAILED" },
      versionConflict: { status: 409, code: "VERSION_CONFLICT" },
    })
  })
})
