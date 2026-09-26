import type { CloudflareEnv } from "../../../src/types/cloudflare-env"
import type { RequestContextData } from "../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../_shared/response"
import {
  parseSessionCookie,
  serializeClearSessionCookie,
  validateSession,
} from "../../_shared/session"

export const onRequestGet: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  request,
  env,
  data,
}) => {
  const requestId = data.requestId
  const url = new URL(request.url)
  const isHttps = url.protocol === "https:"

  let auth = data.auth

  // If not yet populated by middleware, validate directly
  if (!auth) {
    const token = parseSessionCookie(request)
    if (token) {
      auth = await validateSession(env.DB, token)
    }
  }

  if (!auth) {
    return problemResponse(
      {
        status: 401,
        code: "AUTHENTICATION_REQUIRED",
        title: "Otentikasi Diperlukan",
        detail: "Sesi otentikasi tidak ditemukan atau telah berakhir setelah 15 menit tidak aktif.",
        instance: url.pathname,
      },
      requestId,
      {
        "Set-Cookie": serializeClearSessionCookie(isHttps),
      },
    )
  }

  return jsonResponse(
    {
      user: auth.user,
      session: auth.session,
    },
    requestId,
  )
}
