/**
 * GET /api/admin/users/[id] — Get a single user
 * PUT /api/admin/users/[id] — Update user data (fullName, role, profession, unitId)
 * PATCH /api/admin/users/[id] — Toggle activation status
 * DELETE /api/admin/users/[id] — Delete an unreferenced user
 *
 * RBAC: ADMINISTRATOR only (canManageUsers)
 * Security: CSRF required for PUT/PATCH/DELETE; authentication required for all
 */

import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import { canManageUsers } from "../../../_shared/rbac"
import { revokeAllUserSessions } from "../../../_shared/session"
import type { RequestContextData } from "../../../_shared/request-context"
import { jsonResponse, problemResponse } from "../../../_shared/response"

const VALID_ROLES = [
  "TENAGA_KESEHATAN",
  "KEPALA_RUANGAN",
  "KOMITE_PMKP",
  "ADMINISTRATOR",
] as const
type UserRole = (typeof VALID_ROLES)[number]

interface UserRow {
  id: string
  username: string
  full_name: string
  role: UserRole
  profession: string
  unit_id: string
  is_active: number
  created_at: string
  updated_at: string
}

function safeUserPayload(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    profession: row.profession,
    unitId: row.unit_id,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const onRequestGet: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
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
      { status: 401, code: "AUTHENTICATION_REQUIRED", title: "Otentikasi Diperlukan",
        detail: "Sesi otentikasi tidak ditemukan atau telah berakhir.", instance: url.pathname },
      requestId,
    )
  }

  if (!canManageUsers(auth.user)) {
    return problemResponse(
      { status: 403, code: "FORBIDDEN", title: "Akses Ditolak",
        detail: "Manajemen pengguna hanya dapat diakses oleh Administrator.", instance: url.pathname },
      requestId,
    )
  }

  const userId = typeof params.id === "string" ? params.id : (params.id[0] ?? "")
  const user = await env.DB.prepare(
    `SELECT id, username, full_name, role, profession, unit_id, is_active, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(userId)
    .first<UserRow>()

  if (!user) {
    return problemResponse(
      { status: 404, code: "USER_NOT_FOUND", title: "Pengguna Tidak Ditemukan",
        detail: "Pengguna dengan ID yang ditentukan tidak ditemukan.", instance: url.pathname },
      requestId,
    )
  }

  return jsonResponse(safeUserPayload(user), requestId)
}

export const onRequestPut: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
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
      { status: 401, code: "AUTHENTICATION_REQUIRED", title: "Otentikasi Diperlukan",
        detail: "Sesi otentikasi tidak ditemukan atau telah berakhir.", instance: url.pathname },
      requestId,
    )
  }

  if (!canManageUsers(auth.user)) {
    return problemResponse(
      { status: 403, code: "FORBIDDEN", title: "Akses Ditolak",
        detail: "Manajemen pengguna hanya dapat diakses oleh Administrator.", instance: url.pathname },
      requestId,
    )
  }

  const userId = typeof params.id === "string" ? params.id : (params.id[0] ?? "")

  // Fetch existing user
  const existing = await env.DB.prepare(
    `SELECT id, username, full_name, role, profession, unit_id, is_active, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(userId)
    .first<UserRow>()

  if (!existing) {
    return problemResponse(
      { status: 404, code: "USER_NOT_FOUND", title: "Pengguna Tidak Ditemukan",
        detail: "Pengguna dengan ID yang ditentukan tidak ditemukan.", instance: url.pathname },
      requestId,
    )
  }

  let body: Record<string, unknown> = {}
  try {
    const raw: unknown = await request.json()
    if (typeof raw === "object" && raw !== null) {
      body = raw as Record<string, unknown>
    }
  } catch {
    return problemResponse(
      { status: 400, code: "MALFORMED_REQUEST", title: "Permintaan Tidak Valid",
        detail: "Format JSON pada request body tidak valid.", instance: url.pathname },
      requestId,
    )
  }

  const errors: Array<{ path: string; code: string; message: string }> = []

  const fullName =
    typeof body.full_name === "string" ? body.full_name.trim() : existing.full_name
  if (!fullName || fullName.length < 2 || fullName.length > 150) {
    errors.push({ path: "full_name", code: "REQUIRED", message: "Nama lengkap wajib diisi, minimal 2 karakter." })
  }

  const role = typeof body.role === "string" ? body.role : existing.role
  if (!(VALID_ROLES as readonly string[]).includes(role)) {
    errors.push({ path: "role", code: "INVALID_ENUM", message: `Peran tidak valid: ${VALID_ROLES.join(", ")}.` })
  }

  const profession =
    typeof body.profession === "string" ? body.profession.trim() : existing.profession
  if (!profession || profession.length < 2 || profession.length > 100) {
    errors.push({ path: "profession", code: "REQUIRED", message: "Profesi/jabatan wajib diisi." })
  }

  const unitId =
    typeof body.unit_id === "string" && body.unit_id.trim()
      ? body.unit_id.trim().toUpperCase()
      : existing.unit_id

  if (errors.length > 0) {
    return problemResponse(
      { status: 400, code: "VALIDATION_FAILED", title: "Validasi Gagal",
        detail: "Satu atau lebih field tidak valid.", instance: url.pathname, errors },
      requestId,
    )
  }

  const now = new Date().toISOString()
  await env.DB.prepare(
    `UPDATE users SET full_name = ?, role = ?, profession = ?, unit_id = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(fullName, role as UserRole, profession, unitId, now, userId)
    .run()

  const updated = await env.DB.prepare(
    `SELECT id, username, full_name, role, profession, unit_id, is_active, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(userId)
    .first<UserRow>()

  return jsonResponse(updated ? safeUserPayload(updated) : { id: userId }, requestId)
}

/**
 * PATCH /api/admin/users/[id]
 * Body: { action: "activate" | "deactivate" }
 */
export const onRequestPatch: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
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
      { status: 401, code: "AUTHENTICATION_REQUIRED", title: "Otentikasi Diperlukan",
        detail: "Sesi otentikasi tidak ditemukan atau telah berakhir.", instance: url.pathname },
      requestId,
    )
  }

  if (!canManageUsers(auth.user)) {
    return problemResponse(
      { status: 403, code: "FORBIDDEN", title: "Akses Ditolak",
        detail: "Manajemen pengguna hanya dapat diakses oleh Administrator.", instance: url.pathname },
      requestId,
    )
  }

  const userId = typeof params.id === "string" ? params.id : (params.id[0] ?? "")

  // An administrator cannot deactivate themselves
  if (userId === auth.user.id) {
    return problemResponse(
      { status: 403, code: "SELF_DEACTIVATION_FORBIDDEN", title: "Akses Ditolak",
        detail: "Administrator tidak dapat mengubah status aktif akun sendiri.", instance: url.pathname },
      requestId,
    )
  }

  const existing = await env.DB.prepare(
    `SELECT id, username, full_name, role, profession, unit_id, is_active, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(userId)
    .first<UserRow>()

  if (!existing) {
    return problemResponse(
      { status: 404, code: "USER_NOT_FOUND", title: "Pengguna Tidak Ditemukan",
        detail: "Pengguna dengan ID yang ditentukan tidak ditemukan.", instance: url.pathname },
      requestId,
    )
  }

  let body: Record<string, unknown> = {}
  try {
    const raw: unknown = await request.json()
    if (typeof raw === "object" && raw !== null) {
      body = raw as Record<string, unknown>
    }
  } catch {
    return problemResponse(
      { status: 400, code: "MALFORMED_REQUEST", title: "Permintaan Tidak Valid",
        detail: "Format JSON pada request body tidak valid.", instance: url.pathname },
      requestId,
    )
  }

  const action = typeof body.action === "string" ? body.action : ""
  if (action !== "activate" && action !== "deactivate") {
    return problemResponse(
      {
        status: 400,
        code: "INVALID_ACTION",
        title: "Aksi Tidak Valid",
        detail: "Nilai 'action' harus 'activate' atau 'deactivate'.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  const newIsActive = action === "activate" ? 1 : 0
  const now = new Date().toISOString()

  await env.DB.prepare(
    `UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(newIsActive, now, userId)
    .run()

  // On deactivation: revoke all active sessions for security
  if (action === "deactivate") {
    await revokeAllUserSessions(env.DB, userId, "ADMIN_DEACTIVATION")
  }

  const updated = await env.DB.prepare(
    `SELECT id, username, full_name, role, profession, unit_id, is_active, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(userId)
    .first<UserRow>()

  return jsonResponse(updated ? safeUserPayload(updated) : { id: userId }, requestId)
}

export const onRequestDelete: PagesFunction<CloudflareEnv, "id", RequestContextData> = async ({
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
  if (userId === auth.user.id) {
    return problemResponse(
      {
        status: 403,
        code: "SELF_DELETION_FORBIDDEN",
        title: "Akses Ditolak",
        detail: "Administrator tidak dapat menghapus akun sendiri.",
        instance: url.pathname,
      },
      requestId,
    )
  }

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

  try {
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/foreign key|constraint/i.test(message)) {
      return problemResponse(
        {
          status: 409,
          code: "USER_STILL_REFERENCED",
          title: "Pengguna Tidak Dapat Dihapus",
          detail:
            "Pengguna masih tercatat pada riwayat laporan atau audit. Nonaktifkan akun untuk mempertahankan integritas riwayat klinis.",
          instance: url.pathname,
        },
        requestId,
      )
    }
    throw error
  }

  return jsonResponse({ deleted: true, id: userId }, requestId)
}
