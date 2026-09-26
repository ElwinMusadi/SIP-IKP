import type { CloudflareEnv } from "../../../src/types/cloudflare-env"
import { verifyPassword } from "../../_shared/password"
import type { RequestContextData } from "../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../_shared/response"
import { createSession, serializeSessionCookie } from "../../_shared/session"

interface LoginBody {
  username?: unknown
  password?: unknown
  rememberMe?: unknown
}

interface UserRow {
  id: string
  username: string
  password_hash: string
  full_name: string
  role: "TENAGA_KESEHATAN" | "KEPALA_RUANGAN" | "KOMITE_PMKP" | "ADMINISTRATOR"
  profession: string
  unit_id: string
  is_active: number
}

export const onRequestPost: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  request,
  env,
  data,
}) => {
  const requestId = data.requestId
  const url = new URL(request.url)

  let body: LoginBody = {}
  try {
    const raw: unknown = await request.json()
    if (typeof raw === "object" && raw !== null) {
      body = raw
    }
  } catch {
    return problemResponse(
      {
        status: 400,
        code: "MALFORMED_REQUEST",
        title: "Permintaan Tidak Valid",
        detail: "Format JSON pada request body tidak valid.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const username = typeof body.username === "string" ? body.username.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!username || !password) {
    return problemResponse(
      {
        status: 400,
        code: "VALIDATION_ERROR",
        title: "Validasi Gagal",
        detail: "Username dan password wajib diisi.",
        instance: url.pathname,
        errors: [
          ...(!username
            ? [{ path: "username", code: "REQUIRED", message: "Username wajib diisi." }]
            : []),
          ...(!password
            ? [{ path: "password", code: "REQUIRED", message: "Password wajib diisi." }]
            : []),
        ],
      },
      requestId,
    )
  }

  const user = await env.DB.prepare(
    `SELECT id, username, password_hash, full_name, role, profession, unit_id, is_active
     FROM users
     WHERE username = ?
     LIMIT 1`,
  )
    .bind(username)
    .first<UserRow>()

  // Uniform failure response to prevent account enumeration
  const invalidCredentialsResponse = () =>
    problemResponse(
      {
        status: 401,
        code: "INVALID_CREDENTIALS",
        title: "Kredensial Tidak Valid",
        detail: "Username atau password yang Anda masukkan salah.",
        instance: url.pathname,
      },
      requestId,
    )

  if (!user || user.is_active !== 1) {
    return invalidCredentialsResponse()
  }

  const isPasswordValid = await verifyPassword(password, user.password_hash)
  if (!isPasswordValid) {
    return invalidCredentialsResponse()
  }

  // Create active session in D1
  const { token, csrfToken } = await createSession(env.DB, user.id)

  const isHttps = url.protocol === "https:"
  const cookieHeader = serializeSessionCookie(token, isHttps)

  return jsonResponse(
    {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        profession: user.profession,
        unitId: user.unit_id,
      },
      session: {
        csrfToken,
        idleExpiresInSeconds: 900,
      },
    },
    requestId,
    200,
    {
      "Set-Cookie": cookieHeader,
    },
  )
}
