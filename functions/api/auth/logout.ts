import type { CloudflareEnv } from "../../../src/types/cloudflare-env"
import type { RequestContextData } from "../../_shared/request-context"
import { jsonResponse } from "../../_shared/response"
import {
  parseSessionCookie,
  revokeSession,
  serializeClearSessionCookie,
} from "../../_shared/session"

export const onRequestPost: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  request,
  env,
  data,
}) => {
  const requestId = data.requestId
  const url = new URL(request.url)
  const isHttps = url.protocol === "https:"

  const token = parseSessionCookie(request)
  if (token) {
    await revokeSession(env.DB, token, "USER_LOGOUT")
  }

  const clearCookieHeader = serializeClearSessionCookie(isHttps)

  return jsonResponse(
    {
      loggedOut: true,
    },
    requestId,
    200,
    {
      "Set-Cookie": clearCookieHeader,
    },
  )
}
