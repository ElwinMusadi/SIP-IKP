import type { CloudflareEnv } from "../../../../../src/types/cloudflare-env"
import { hashPassword } from "../../../../_shared/password"
import { canManageUsers } from "../../../../_shared/rbac"
import type { RequestContextData } from "../../../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../../../_shared/response"
import { revokeAllUserSessions } from "../../../../_shared/session"

export const onRequestPost: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
  env,
  data,
  params,
  request,
}) => {
  const requestId = data.requestId
  const url = new URL(request.url)
  const auth = data.auth

  if (!auth) {
    return problemResponse(
      {
        status: 401,
        code: "AUTHENTICATION_REQUIRED",
        title: "Otentikasi Diperlukan",
        detail: "Sesi otentikasi tidak ditemukan atau telah berakhir.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  if (!canManageUsers(auth.user)) {
    return problemResponse(
      {
        status: 403,
        code: "FORBIDDEN",
        title: "Akses Ditolak",
        detail: "Manajemen pengguna hanya dapat diakses oleh Administrator.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const userId = typeof params.id === "string" ? params.id : (params.id[0] ?? "")
  const existing = await env.DB.prepare("SELECT id FROM users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<{ id: string }>()

  if (!existing) {
    return problemResponse(
      {
        status: 404,
        code: "USER_NOT_FOUND",
        title: "Pengguna Tidak Ditemukan",
        detail: "Pengguna dengan ID yang ditentukan tidak ditemukan.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  let body: Record<string, unknown>
  try {
    const raw: unknown = await request.json()
    body = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {}
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

  const password = typeof body.password === "string" ? body.password : ""
  if (password.length < 8) {
    return problemResponse(
      {
        status: 400,
        code: "VALIDATION_FAILED",
        title: "Validasi Gagal",
        detail: "Kata sandi baru wajib terdiri dari minimal 8 karakter.",
        instance: url.pathname,
        errors: [
          {
            path: "password",
            code: "TOO_SHORT",
            message: "Kata sandi baru wajib terdiri dari minimal 8 karakter.",
          },
        ],
      },
      requestId,
    )
  }

  const now = new Date().toISOString()
  const passwordHash = await hashPassword(password)
  await env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
    .bind(passwordHash, now, userId)
    .run()
  await revokeAllUserSessions(env.DB, userId, "ADMIN_PASSWORD_RESET")

  return jsonResponse({ passwordChanged: true, id: userId }, requestId)
}
