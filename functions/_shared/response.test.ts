import { describe, expect, it } from "vitest"

import { jsonResponse, problemResponse } from "./response"

describe("standard response envelope and problem details", () => {
  it("formats standard success envelope with data and meta", async () => {
    const res = jsonResponse({ hello: "world" }, "req_123", 200, { "X-Custom": "val" })

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8")
    expect(res.headers.get("X-Request-ID")).toBe("req_123")
    expect(res.headers.get("Cache-Control")).toBe("no-store, private")
    expect(res.headers.get("X-Custom")).toBe("val")

    await expect(res.json()).resolves.toEqual({
      data: { hello: "world" },
      meta: { requestId: "req_123" },
    })
  })

  it("formats RFC 9457 problem details", async () => {
    const res = problemResponse(
      {
        status: 422,
        code: "VALIDATION_ERROR",
        title: "Validation Error",
        detail: "Field invalid",
        instance: "/api/test",
        errors: [{ path: "username", code: "REQUIRED", message: "Username wajib diisi" }],
      },
      "req_456",
    )

    expect(res.status).toBe(422)
    expect(res.headers.get("Content-Type")).toBe("application/problem+json; charset=utf-8")
    expect(res.headers.get("X-Request-ID")).toBe("req_456")

    const body = await res.json()
    expect(body).toMatchObject({
      type: "https://sip-ikp.rsudwzjohannes.id/problems/validation-error",
      status: 422,
      code: "VALIDATION_ERROR",
      title: "Validation Error",
      detail: "Field invalid",
      instance: "/api/test",
      requestId: "req_456",
      errors: [{ path: "username", code: "REQUIRED", message: "Username wajib diisi" }],
    })
  })
})
