import type { CloudflareEnv } from "../src/types/cloudflare-env"
import { createSafeLogRecord } from "./_shared/log-redaction"
import type { RequestContextData } from "./_shared/request-context"
import { REQUEST_ID_HEADER, resolveRequestId } from "./_shared/request-id"

const securityHeaders: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
}

export const onRequest: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  data,
  next,
  request,
}) => {
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER))
  data.requestId = requestId
  const startedAt = Date.now()

  let response: Response

  try {
    response = await next()
  } catch (error) {
    console.error(
      createSafeLogRecord("request.unhandled_error", requestId, {
        method: request.method,
        path: new URL(request.url).pathname,
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
      path: new URL(request.url).pathname,
      status: securedResponse.status,
      durationMs: Date.now() - startedAt,
    }),
  )

  return securedResponse
}
