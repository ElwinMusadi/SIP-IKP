import type { CloudflareEnv } from "../src/types/cloudflare-env"
import { createSafeLogRecord } from "./_shared/log-redaction"
import type { RequestContextData } from "./_shared/request-context"
import { REQUEST_ID_HEADER, resolveRequestId } from "./_shared/request-id"
import { problemResponse } from "./_shared/response"
import { CSRF_HEADER_NAME, parseSessionCookie, validateSession } from "./_shared/session"

const securityHeaders: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

export const onRequest: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  data,
  env,
  next,
  request,
}) => {
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER))
  data.requestId = requestId
  const startedAt = Date.now()
  const url = new URL(request.url)

  // 1. Resolve session from cookie if present
  let auth = data.auth ?? null
  if (!auth) {
    const sessionToken = parseSessionCookie(request)
    if (sessionToken) {
      try {
        auth = await validateSession(env.DB, sessionToken)
      } catch (error) {
        console.error(
          createSafeLogRecord("session.validation_error", requestId, {
            errorName: error instanceof Error ? error.name : "SessionError",
          }),
        )
      }
    }
  }
  data.auth = auth

  // 2. CSRF Protection for state-changing API endpoints
  // Login is the public entry point to establish a session, so it does not require a prior CSRF token
  const isPublicAuthEndpoint = url.pathname === "/api/auth/login"
  if (
    url.pathname.startsWith("/api/") &&
    UNSAFE_METHODS.has(request.method) &&
    !isPublicAuthEndpoint &&
    auth !== null
  ) {
    const providedCsrfToken = request.headers.get(CSRF_HEADER_NAME)
    if (!providedCsrfToken || providedCsrfToken !== auth.session.csrfToken) {
      return problemResponse(
        {
          status: 403,
          code: "CSRF_TOKEN_INVALID",
          title: "Token CSRF Tidak Valid",
          detail: "Permintaan ditolak karena token anti-CSRF tidak valid atau tidak disertakan.",
          instance: url.pathname,
        },
        requestId,
      )
    }
  }

  let response: Response

  try {
    response = await next()
  } catch (error) {
    console.error(
      createSafeLogRecord("request.unhandled_error", requestId, {
        method: request.method,
        path: url.pathname,
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
    )
    throw error
  }

  const securedResponse = new Response(response.body, response)

  for (const [name, value] of Object.entries(securityHeaders)) {
    securedResponse.headers.set(name, value)
  }

  securedResponse.headers.set(REQUEST_ID_HEADER, requestId)

  if (securedResponse.headers.get("Content-Type")?.includes("text/html")) {
    securedResponse.headers.set("Cache-Control", "no-store")
  }

  console.info(
    createSafeLogRecord("request.completed", requestId, {
      method: request.method,
      path: url.pathname,
      status: securedResponse.status,
      durationMs: Date.now() - startedAt,
    }),
  )

  return securedResponse
}
