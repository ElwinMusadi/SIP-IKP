/**
 * GET /api/admin/users — List all users
 * POST /api/admin/users — Create a new user
 *
 * RBAC: ADMINISTRATOR only (canManageUsers)
 * Security: CSRF required for POST; authentication required for all
 */

import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import { hashPassword } from "../../../_shared/password"
import { canManageUsers } from "../../../_shared/rbac"
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
  // password_hash is intentionally excluded from SELECT
}

/** Strip internal fields before sending to client */
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

export const onRequestGet: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  env,
  data,
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

  const params = url.searchParams
  const search = params.get("search")?.trim() ?? ""
  const roleFilter = params.get("role")?.trim() ?? ""
  const activeFilter = params.get("active")?.trim() ?? ""

  let query = `
    SELECT id, username, full_name, role, profession, unit_id, is_active, created_at, updated_at
    FROM users
    WHERE 1=1
  `
  const bindings: unknown[] = []

  if (search) {
    query += ` AND (username LIKE ? OR full_name LIKE ?)`
    const pattern = `%${search}%`
    bindings.push(pattern, pattern)
  }

  if (roleFilter && (VALID_ROLES as readonly string[]).includes(roleFilter)) {
    query += ` AND role = ?`
    bindings.push(roleFilter)
  }

  if (activeFilter === "true") {
    query += ` AND is_active = 1`
  } else if (activeFilter === "false") {
    query += ` AND is_active = 0`
  }

  query += ` ORDER BY created_at ASC`

  const result = await env.DB.prepare(query).bind(...bindings).all<UserRow>()
  const users = result.results.map(safeUserPayload)

  return jsonResponse(users, requestId)
}

export const onRequestPost: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  env,
  data,
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

  let body: Record<string, unknown> = {}
  try {
    const raw: unknown = await request.json()
    if (typeof raw === "object" && raw !== null) {
      body = raw as Record<string, unknown>
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

  // --- Validate inputs ---
  const errors: Array<{ path: string; code: string; message: string }> = []

  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : ""
  if (!username || username.length < 3 || username.length > 50) {
    errors.push({
      path: "username",
      code: "INVALID",
      message: "Username wajib diisi, minimal 3 karakter, maksimal 50 karakter.",
    })
  } else if (!/^[a-z0-9_]+$/.test(username)) {
    errors.push({
      path: "username",
      code: "FORMAT",
      message: "Username hanya boleh menggunakan huruf kecil, angka, dan underscore.",
    })
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : ""
  if (!fullName || fullName.length < 2 || fullName.length > 150) {
    errors.push({
      path: "full_name",
      code: "REQUIRED",
      message: "Nama lengkap wajib diisi, minimal 2 karakter.",
    })
  }

  const role = body.role as string | undefined
  if (!role || !(VALID_ROLES as readonly string[]).includes(role)) {
    errors.push({
      path: "role",
      code: "INVALID_ENUM",
      message: `Peran wajib dipilih: ${VALID_ROLES.join(", ")}.`,
    })
  }

  const profession = typeof body.profession === "string" ? body.profession.trim() : ""
  if (!profession || profession.length < 2 || profession.length > 100) {
    errors.push({
      path: "profession",
      code: "REQUIRED",
      message: "Profesi/jabatan wajib diisi.",
    })
  }

  const unitId =
    typeof body.unit_id === "string" && body.unit_id.trim()
      ? body.unit_id.trim().toUpperCase()
      : "IBS"

  const password = typeof body.password === "string" ? body.password : ""
  if (!password || password.length < 8) {
    errors.push({
      path: "password",
      code: "TOO_SHORT",
      message: "Kata sandi wajib diisi, minimal 8 karakter.",
    })
  }

  if (errors.length > 0) {
    return problemResponse(
      {
        status: 400,
        code: "VALIDATION_FAILED",
        title: "Validasi Gagal",
        detail: "Satu atau lebih field tidak valid.",
        instance: url.pathname,
        errors,
      },
      requestId,
    )
  }

  // Check username uniqueness
  const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ? LIMIT 1")
    .bind(username)
    .first<{ id: string }>()

  if (existing) {
    return problemResponse(
      {
        status: 409,
        code: "USERNAME_TAKEN",
        title: "Username Sudah Digunakan",
        detail: "Username tersebut sudah digunakan oleh pengguna lain. Pilih username yang berbeda.",
        instance: url.pathname,
      },
      requestId,
    )
  }

  // Hash password using existing PBKDF2-HMAC-SHA-256 mechanism
  const passwordHash = await hashPassword(password)
  const newId = crypto.randomUUID()
  const now = new Date().toISOString()

  await env.DB.prepare(
    `INSERT INTO users (id, username, password_hash, full_name, role, profession, unit_id, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  )
    .bind(newId, username, passwordHash, fullName, role as UserRole, profession, unitId, now, now)
    .run()

  const created = await env.DB.prepare(
    `SELECT id, username, full_name, role, profession, unit_id, is_active, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(newId)
    .first<UserRow>()

  return jsonResponse(created ? safeUserPayload(created) : { id: newId }, requestId, 201)
}
