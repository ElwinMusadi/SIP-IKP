import { describe, expect, it, vi } from "vitest"

import type { CloudflareEnv } from "../src/types/cloudflare-env"
import type { RequestContextData } from "./_shared/request-context"
import type { AuthSessionContext } from "./_shared/session"
import { onRequest } from "./_middleware"

type MiddlewareContext = Parameters<typeof onRequest>[0]

function createContext(
  request: globalThis.Request,
  response = Response.json({ status: "ok" }),
  initialData: Partial<RequestContextData> = {},
) {
  const data = { ...initialData } as RequestContextData
  const next = vi.fn(async () => response)

  return {
    context: {
      request,
      env: { APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data,
      functionPath: "functions/_middleware.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      next,
    } as unknown as MiddlewareContext,
    data,
    next,
  }
}

describe("Pages Functions middleware foundation", () => {
  it("propagates a valid request ID to context and response", async () => {
    const { context, data } = createContext(
      new Request("https://example.test/api/health", {
        headers: { "X-Request-ID": "client-request-01" },
      }),
    )

    const response = await onRequest(context)

    expect(data.requestId).toBe("client-request-01")
    expect(response.headers.get("X-Request-ID")).toBe("client-request-01")
  })

  it("replaces invalid request IDs", async () => {
    const { context, data } = createContext(
      new Request("https://example.test/api/health", {
        headers: { "X-Request-ID": "invalid id" },
      }),
    )

    const response = await onRequest(context)

    expect(data.requestId).not.toBe("invalid id")
    expect(response.headers.get("X-Request-ID")).toBe(data.requestId)
  })

  it("rejects mutating API requests when authenticated but CSRF token is missing", async () => {
    const mockAuth: AuthSessionContext = {
      user: {
        id: "usr_1",
        username: "test",
        fullName: "Test",
        role: "TENAGA_KESEHATAN",
        profession: "Nakes",
        unitId: "IBS",
        isActive: true,
      },
      session: {
        id: "ses_1",
        csrfToken: "valid_csrf_token_123",
        idleExpiresInSeconds: 900,
        absoluteExpiresInSeconds: 36000,
      },
    }

    const { context, next } = createContext(
      new Request("https://example.test/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      Response.json({ success: true }),
      { auth: mockAuth },
    )

    const response = await onRequest(context)

    expect(response.status).toBe(403)
    const body: { code?: string } = await response.json()
    expect(body.code).toBe("CSRF_TOKEN_INVALID")
    expect(next).not.toHaveBeenCalled()
  })

  it("permits mutating API requests when CSRF token matches session", async () => {
    const mockAuth: AuthSessionContext = {
      user: {
        id: "usr_1",
        username: "test",
        fullName: "Test",
        role: "TENAGA_KESEHATAN",
        profession: "Nakes",
        unitId: "IBS",
        isActive: true,
      },
      session: {
        id: "ses_1",
        csrfToken: "valid_csrf_token_123",
        idleExpiresInSeconds: 900,
        absoluteExpiresInSeconds: 36000,
      },
    }

    const { context, next } = createContext(
      new Request("https://example.test/api/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": "valid_csrf_token_123",
        },
      }),
      Response.json({ success: true }),
      { auth: mockAuth },
    )

    const response = await onRequest(context)

    expect(response.status).toBe(200)
    expect(next).toHaveBeenCalled()
  })
})
