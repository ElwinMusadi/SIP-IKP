import { expect } from "vitest"

export interface ApiHarnessOptions {
  requestId?: string
  status?: number
  body?: unknown
  headers?: HeadersInit
}

export function createApiHarnessResponse(options: ApiHarnessOptions = {}): Response {
  const requestId = options.requestId ?? "test-request-id"
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json; charset=utf-8")
  headers.set("X-Request-ID", requestId)

  return Response.json(options.body ?? { status: "ok", requestId }, {
    status: options.status ?? 200,
    headers,
  })
}

export async function expectJsonResponse(
  response: Response,
  expected: {
    status: number
    requestId?: string
    body?: unknown
  },
): Promise<void> {
  expect(response.status).toBe(expected.status)
  expect(response.headers.get("Content-Type")).toContain("application/json")

  if (expected.requestId) {
    expect(response.headers.get("X-Request-ID")).toBe(expected.requestId)
  }

  if (expected.body !== undefined) {
    await expect(response.json()).resolves.toEqual(expected.body)
  }
}

export const candidateConcurrencyProblems = {
  missingPrecondition: {
    status: 428,
    code: "PRECONDITION_REQUIRED",
  },
  staleEtag: {
    status: 412,
    code: "PRECONDITION_FAILED",
  },
  versionConflict: {
    status: 409,
    code: "VERSION_CONFLICT",
  },
} as const
