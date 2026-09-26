import { describe, expect, it, vi } from "vitest"

import type { CloudflareEnv } from "../src/types/cloudflare-env"
import type { RequestContextData } from "./_shared/request-context"
import { onRequest } from "./_middleware"

type MiddlewareContext = Parameters<typeof onRequest>[0]

function createContext(request: globalThis.Request, response = Response.json({ status: "ok" })) {
  const data = {} as RequestContextData
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
})
