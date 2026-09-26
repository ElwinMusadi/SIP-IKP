import { describe, expect, it } from "vitest"

import { isValidRequestId, resolveRequestId } from "./request-id"

describe("request ID foundation", () => {
  const generatedId = "generated-request-id"
  const generate = () => generatedId

  it("generates an ID when the header is missing", () => {
    expect(resolveRequestId(null, generate)).toBe(generatedId)
  })

  it("preserves a valid client request ID", () => {
    expect(resolveRequestId("client-request_2026", generate)).toBe("client-request_2026")
  })

  it("replaces an invalid request ID", () => {
    expect(resolveRequestId("bad request id", generate)).toBe(generatedId)
  })

  it("replaces an oversized request ID", () => {
    expect(resolveRequestId(`r${"x".repeat(64)}`, generate)).toBe(generatedId)
  })

  it("accepts only bounded safe identifiers", () => {
    expect(isValidRequestId("request-01")).toBe(true)
    expect(isValidRequestId("short")).toBe(false)
  })
})
