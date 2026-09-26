import { describe, expect, it } from "vitest"

import type { CloudflareEnv } from "../../src/types/cloudflare-env"
import type { RequestContextData } from "../_shared/request-context"
import { onRequestGet } from "./health"

type HealthContext = Parameters<typeof onRequestGet>[0]

describe("health API harness surface", () => {
  it("returns request ID in JSON for future API test correlation", async () => {
    const context = {
      request: new Request("https://example.test/api/health"),
      env: { APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data: { requestId: "test-request-id" } satisfies RequestContextData,
      functionPath: "functions/api/health.ts",
      waitUntil() {},
      passThroughOnException() {},
      async next() {
        return new Response(null, { status: 404 })
      },
    } as unknown as HealthContext

    const response = await onRequestGet(context)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "sip-ikp-pages-functions",
      environment: "test",
      requestId: "test-request-id",
    })
  })
})
