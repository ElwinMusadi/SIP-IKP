/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters, @typescript-eslint/no-unnecessary-type-assertion */
/**
 * User Management API Tests — Phase 15
 *
 * Covers:
 * - Admin access allowed
 * - Non-admin roles denied
 * - Unauthenticated denied
 * - List users
 * - Create user (valid / validation / username taken)
 * - Update user
 * - Activate / Deactivate
 * - Self-deactivation prevention
 * - Password not exposed
 */

import { describe, expect, it, vi } from "vitest"

import type { RequestContextData } from "../../_shared/request-context"
import type { AuthSessionContext } from "../../_shared/session"
import { onRequestGet as onListGet, onRequestPost as onCreatePost } from "./users/index"
import {
  onRequestDelete as onDeleteUser,
  onRequestGet as onGetUser,
  onRequestPatch as onPatchUser,
  onRequestPut as onPutUser,
} from "./users/[id]"
import { onRequestPost as onPasswordPost } from "./users/[id]/password"

// ─── Mock actors ─────────────────────────────────────────────────

const adminActor: AuthSessionContext = {
  user: {
    id: "usr_admin_1",
    username: "admin_1",
    fullName: "Administrator SIMRS",
    role: "ADMINISTRATOR",
    profession: "Pranata Komputer",
    unitId: "IBS",
    isActive: true,
  },
  session: { id: "ses_admin", csrfToken: "csrf_admin", idleExpiresInSeconds: 900, absoluteExpiresInSeconds: 36000 },
}

const nakesActor: AuthSessionContext = {
  user: {
    id: "usr_nakes_1",
    username: "nakes_1",
    fullName: "Ns. Maria",
    role: "TENAGA_KESEHATAN",
    profession: "Perawat Bedah",
    unitId: "IBS",
    isActive: true,
  },
  session: { id: "ses_nakes", csrfToken: "csrf_nakes", idleExpiresInSeconds: 900, absoluteExpiresInSeconds: 36000 },
}

const headroomActor: AuthSessionContext = {
  user: {
    id: "usr_headroom_1",
    username: "headroom_1",
    fullName: "Ns. Yohanes",
    role: "KEPALA_RUANGAN",
    profession: "Kepala Ruangan",
    unitId: "IBS",
    isActive: true,
  },
  session: { id: "ses_headroom", csrfToken: "csrf_headroom", idleExpiresInSeconds: 900, absoluteExpiresInSeconds: 36000 },
}

const pmkpActor: AuthSessionContext = {
  user: {
    id: "usr_pmkp_1",
    username: "pmkp_1",
    fullName: "dr. Robertus",
    role: "KOMITE_PMKP",
    profession: "Komite PMKP",
    unitId: "IBS",
    isActive: true,
  },
  session: { id: "ses_pmkp", csrfToken: "csrf_pmkp", idleExpiresInSeconds: 900, absoluteExpiresInSeconds: 36000 },
}

// ─── In-memory DB ─────────────────────────────────────────────────

function createInMemoryUserDb(options: { failDeleteWithForeignKey?: boolean } = {}) {
  const usersMap = new Map<string, Record<string, unknown>>([
    [
      "usr_existing_1",
      {
        id: "usr_existing_1",
        username: "nakes_ibs",
        // password_hash intentionally stored but never returned in SELECT
        password_hash: "HASHED",
        full_name: "Ns. Maria G. Klau",
        role: "TENAGA_KESEHATAN",
        profession: "Perawat Bedah",
        unit_id: "IBS",
        is_active: 1,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
    ],
    [
      "usr_existing_2",
      {
        id: "usr_existing_2",
        username: "kepala_ruangan",
        password_hash: "HASHED",
        full_name: "Ns. Yohanes Bria",
        role: "KEPALA_RUANGAN",
        profession: "Kepala Ruangan",
        unit_id: "IBS",
        is_active: 1,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
    ],
  ])

  const revokedSessions: string[] = []

  const db = {
    prepare(sql: string) {
      let boundParams: unknown[] = []
      return {
        bind(...params: unknown[]) {
          boundParams = params
          return this
        },
        async first<T = Record<string, unknown>>(): Promise<T | null> {
          // Unique username check
          if (sql.includes("FROM users WHERE username = ?")) {
            const username = boundParams[0] as string
            const found = Array.from(usersMap.values()).find((u) => u.username === username)
            return (found ? { id: found.id } : null) as T | null
          }
          // Get by id
          if (sql.includes("FROM users WHERE id = ?")) {
            const id = boundParams[0] as string
            const found = usersMap.get(id)
            if (!found) return null
            // Return WITHOUT password_hash (as the real queries do)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password_hash: _ph, ...safe } = found
            return safe as T
          }
          if (sql.includes("INSERT INTO report_number_sequences")) {
            return { current_sequence: 1 } as T
          }
          return null
        },
        async all<T = Record<string, unknown>>() {
          if (sql.includes("FROM users")) {
            const list = Array.from(usersMap.values()).map((u) => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { password_hash: _ph, ...safe } = u
              return safe
            })
            return { results: list as T[] }
          }
          return { results: [] as T[] }
        },
        async run() {
          if (sql.includes("INSERT INTO users")) {
            const id = boundParams[0] as string
            const newUser: Record<string, unknown> = {
              id,
              username: boundParams[1],
              password_hash: boundParams[2], // stored but never returned to client
              full_name: boundParams[3],
              role: boundParams[4],
              profession: boundParams[5],
              unit_id: boundParams[6],
              is_active: 1,
              created_at: boundParams[7],
              updated_at: boundParams[8],
            }
            usersMap.set(id, newUser)
            return { meta: { changes: 1 } }
          }
          if (sql.includes("UPDATE users SET full_name")) {
            const userId = boundParams[boundParams.length - 1] as string
            const existing = usersMap.get(userId)
            if (existing) {
              existing.full_name = boundParams[0]
              existing.role = boundParams[1]
              existing.profession = boundParams[2]
              existing.unit_id = boundParams[3]
              existing.updated_at = boundParams[4]
            }
            return { meta: { changes: 1 } }
          }
          if (sql.includes("UPDATE users SET is_active")) {
            const userId = boundParams[boundParams.length - 1] as string
            const existing = usersMap.get(userId)
            if (existing) {
              existing.is_active = boundParams[0]
              existing.updated_at = boundParams[1]
            }
            return { meta: { changes: 1 } }
          }
          if (sql.includes("UPDATE users SET password_hash")) {
            const userId = boundParams[boundParams.length - 1] as string
            const existing = usersMap.get(userId)
            if (existing) {
              existing.password_hash = boundParams[0]
              existing.updated_at = boundParams[1]
            }
            return { meta: { changes: existing ? 1 : 0 } }
          }
          if (sql.includes("DELETE FROM users WHERE id = ?")) {
            if (options.failDeleteWithForeignKey) {
              throw new Error("FOREIGN KEY constraint failed")
            }
            const userId = boundParams[0] as string
            const deleted = usersMap.delete(userId)
            return { meta: { changes: deleted ? 1 : 0 } }
          }
          // Revoke sessions (revokeAllUserSessions pattern from session.ts)
          if (sql.includes("sessions") && sql.includes("revoked_at") && sql.includes("UPDATE")) {
            revokedSessions.push(boundParams[0] as string)
            return { meta: { changes: 1 } }
          }
          return { meta: { changes: 0 } }
        },
      }
    },
    // Expose for inspection in tests
    _revokedSessions: revokedSessions,
    _usersMap: usersMap,
    batch: vi.fn().mockResolvedValue([]),
  }
  return db
}

type InMemoryDb = ReturnType<typeof createInMemoryUserDb>

function callHandler(
  handler: unknown,
  request: Request,
  db: InMemoryDb,
  data: RequestContextData,
  params: Record<string, string> = {},
): Promise<Response> {
  const fn = handler as (context: unknown) => Promise<Response>
  return fn({
    request,
    env: { DB: db, APP_ENV: "test" },
    params,
    data,
    functionPath: "test",
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
    async next() { return new Response(null) },
  })
}

function makeData(auth: AuthSessionContext | null): RequestContextData {
  return { auth, requestId: "req_test_" + Math.random().toString(36).slice(2) }
}

// ─── LIST USERS ───────────────────────────────────────────────────

describe("GET /api/admin/users — List Users", () => {
  it("admin can list users", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onListGet,
      new Request("http://localhost/api/admin/users"),
      db,
      makeData(adminActor),
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { data: unknown[] }
    expect(Array.isArray(json.data)).toBe(true)
    expect((json.data as unknown[]).length).toBeGreaterThan(0)
  })

  it("unauthenticated returns 401", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onListGet,
      new Request("http://localhost/api/admin/users"),
      db,
      makeData(null),
    )
    expect(res.status).toBe(401)
  })

  it("TENAGA_KESEHATAN returns 403", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onListGet,
      new Request("http://localhost/api/admin/users"),
      db,
      makeData(nakesActor),
    )
    expect(res.status).toBe(403)
  })

  it("KEPALA_RUANGAN returns 403", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onListGet,
      new Request("http://localhost/api/admin/users"),
      db,
      makeData(headroomActor),
    )
    expect(res.status).toBe(403)
  })

  it("KOMITE_PMKP returns 403", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onListGet,
      new Request("http://localhost/api/admin/users"),
      db,
      makeData(pmkpActor),
    )
    expect(res.status).toBe(403)
  })

  it("password_hash is never returned in list", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onListGet,
      new Request("http://localhost/api/admin/users"),
      db,
      makeData(adminActor),
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { data: Record<string, unknown>[] }
    for (const user of json.data) {
      expect(user).not.toHaveProperty("password_hash")
      expect(user).not.toHaveProperty("passwordHash")
    }
  })
})

// ─── CREATE USER ──────────────────────────────────────────────────

describe("POST /api/admin/users — Create User", () => {
  it("admin can create a valid user", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onCreatePost,
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "new_nakes",
          full_name: "Ns. New Staff, S.Kep",
          role: "TENAGA_KESEHATAN",
          profession: "Perawat Bedah",
          unit_id: "IBS",
          password: "SecurePass#2026",
        }),
      }),
      db,
      makeData(adminActor),
    )
    expect(res.status).toBe(201)
    const json = await res.json() as { data: Record<string, unknown> }
    expect(json.data).toHaveProperty("id")
    expect(json.data.username).toBe("new_nakes")
    expect(json.data).not.toHaveProperty("password_hash")
    expect(json.data).not.toHaveProperty("passwordHash")
  })

  it("unauthenticated returns 401", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onCreatePost,
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "x", full_name: "X", role: "TENAGA_KESEHATAN", profession: "X", password: "Password123" }),
      }),
      db,
      makeData(null),
    )
    expect(res.status).toBe(401)
  })

  it("non-admin returns 403", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onCreatePost,
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "x", full_name: "X", role: "TENAGA_KESEHATAN", profession: "X", password: "Password123" }),
      }),
      db,
      makeData(nakesActor),
    )
    expect(res.status).toBe(403)
  })

  it("returns 400 when username is invalid", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onCreatePost,
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "ab", full_name: "Test", role: "TENAGA_KESEHATAN", profession: "P", password: "Password123" }),
      }),
      db,
      makeData(adminActor),
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when password is too short", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onCreatePost,
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "valid_user", full_name: "Test", role: "TENAGA_KESEHATAN", profession: "P", password: "short" }),
      }),
      db,
      makeData(adminActor),
    )
    expect(res.status).toBe(400)
  })

  it("returns 409 when username is taken", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onCreatePost,
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "nakes_ibs", full_name: "Dup Name", role: "TENAGA_KESEHATAN", profession: "Perawat", password: "Password123" }),
      }),
      db,
      makeData(adminActor),
    )
    expect(res.status).toBe(409)
  })

  it("returns 400 when role is invalid", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onCreatePost,
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "x_valid", full_name: "X", role: "FAKE_ROLE", profession: "P", password: "Password123" }),
      }),
      db,
      makeData(adminActor),
    )
    expect(res.status).toBe(400)
  })
})

// ─── UPDATE USER ──────────────────────────────────────────────────

describe("PUT /api/admin/users/[id] — Update User", () => {
  it("admin can update user data", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onPutUser,
      new Request("http://localhost/api/admin/users/usr_existing_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: "Updated Name", role: "TENAGA_KESEHATAN", profession: "Perawat Senior" }),
      }),
      db,
      makeData(adminActor),
      { id: "usr_existing_1" },
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { data: Record<string, unknown> }
    expect(json.data.fullName).toBe("Updated Name")
    expect(json.data).not.toHaveProperty("password_hash")
  })

  it("returns 404 for non-existent user", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onPutUser,
      new Request("http://localhost/api/admin/users/does_not_exist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: "X", role: "TENAGA_KESEHATAN", profession: "P" }),
      }),
      db,
      makeData(adminActor),
      { id: "does_not_exist" },
    )
    expect(res.status).toBe(404)
  })

  it("non-admin returns 403", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onPutUser,
      new Request("http://localhost/api/admin/users/usr_existing_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: "X", role: "TENAGA_KESEHATAN", profession: "P" }),
      }),
      db,
      makeData(nakesActor),
      { id: "usr_existing_1" },
    )
    expect(res.status).toBe(403)
  })
})

// ─── ACTIVATE / DEACTIVATE ────────────────────────────────────────

describe("PATCH /api/admin/users/[id] — Activate / Deactivate", () => {
  it("admin can deactivate a user", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onPatchUser,
      new Request("http://localhost/api/admin/users/usr_existing_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      }),
      db,
      makeData(adminActor),
      { id: "usr_existing_1" },
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { data: Record<string, unknown> }
    expect(json.data.isActive).toBe(false)
  })

  it("deactivation revokes user sessions", async () => {
    const db = createInMemoryUserDb()
    await callHandler(
      onPatchUser,
      new Request("http://localhost/api/admin/users/usr_existing_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      }),
      db,
      makeData(adminActor),
      { id: "usr_existing_1" },
    )
    // Verify revoke was called (sessions update was attempted)
    expect(db._revokedSessions.length).toBeGreaterThan(0)
  })

  it("admin can reactivate a user", async () => {
    const db = createInMemoryUserDb()
    // Deactivate first
    const existingUser = db._usersMap.get("usr_existing_1")
    if (existingUser) existingUser.is_active = 0

    const res = await callHandler(
      onPatchUser,
      new Request("http://localhost/api/admin/users/usr_existing_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      }),
      db,
      makeData(adminActor),
      { id: "usr_existing_1" },
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { data: Record<string, unknown> }
    expect(json.data.isActive).toBe(true)
  })

  it("admin cannot deactivate themselves", async () => {
    const db = createInMemoryUserDb()
    // Add admin to db map
    db._usersMap.set("usr_admin_1", {
      id: "usr_admin_1",
      username: "admin_1",
      password_hash: "HASHED",
      full_name: "Administrator",
      role: "ADMINISTRATOR",
      profession: "Admin",
      unit_id: "IBS",
      is_active: 1,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
    })
    const res = await callHandler(
      onPatchUser,
      new Request("http://localhost/api/admin/users/usr_admin_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      }),
      db,
      makeData(adminActor),
      { id: "usr_admin_1" },
    )
    expect(res.status).toBe(403)
  })

  it("returns 400 for invalid action", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onPatchUser,
      new Request("http://localhost/api/admin/users/usr_existing_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      }),
      db,
      makeData(adminActor),
      { id: "usr_existing_1" },
    )
    expect(res.status).toBe(400)
  })

  it("unauthenticated returns 401", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onPatchUser,
      new Request("http://localhost/api/admin/users/usr_existing_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      }),
      db,
      makeData(null),
      { id: "usr_existing_1" },
    )
    expect(res.status).toBe(401)
  })

  it("KEPALA_RUANGAN cannot deactivate users", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onPatchUser,
      new Request("http://localhost/api/admin/users/usr_existing_1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" }),
      }),
      db,
      makeData(headroomActor),
      { id: "usr_existing_1" },
    )
    expect(res.status).toBe(403)
  })
})

// ─── GET SINGLE USER ─────────────────────────────────────────────

describe("GET /api/admin/users/[id] — Get User", () => {
  it("admin can get a user", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onGetUser,
      new Request("http://localhost/api/admin/users/usr_existing_1"),
      db,
      makeData(adminActor),
      { id: "usr_existing_1" },
    )
    expect(res.status).toBe(200)
    const json = await res.json() as { data: Record<string, unknown> }
    expect(json.data.id).toBe("usr_existing_1")
    expect(json.data).not.toHaveProperty("password_hash")
  })

  it("returns 404 for non-existent user", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onGetUser,
      new Request("http://localhost/api/admin/users/does_not_exist"),
      db,
      makeData(adminActor),
      { id: "does_not_exist" },
    )
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/admin/users/[id] — Delete User", () => {
  it("admin can delete another user", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onDeleteUser,
      new Request("http://localhost/api/admin/users/usr_existing_1", { method: "DELETE" }),
      db,
      makeData(adminActor),
      { id: "usr_existing_1" },
    )

    expect(res.status).toBe(200)
    expect(db._usersMap.has("usr_existing_1")).toBe(false)
  })

  it("admin cannot delete themselves", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onDeleteUser,
      new Request("http://localhost/api/admin/users/usr_admin_1", { method: "DELETE" }),
      db,
      makeData(adminActor),
      { id: "usr_admin_1" },
    )

    expect(res.status).toBe(403)
  })

  it("returns 409 when the user is still referenced by incident history", async () => {
    const db = createInMemoryUserDb({ failDeleteWithForeignKey: true })
    const res = await callHandler(
      onDeleteUser,
      new Request("http://localhost/api/admin/users/usr_existing_1", { method: "DELETE" }),
      db,
      makeData(adminActor),
      { id: "usr_existing_1" },
    )

    expect(res.status).toBe(409)
    const json = await res.json() as { code: string }
    expect(json.code).toBe("USER_STILL_REFERENCED")
    expect(db._usersMap.has("usr_existing_1")).toBe(true)
  })
})

describe("POST /api/admin/users/[id]/password — Reset Password", () => {
  it("admin can reset a password and active sessions are revoked", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onPasswordPost,
      new Request("http://localhost/api/admin/users/usr_existing_1/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "NewSecurePassword#2026" }),
      }),
      db,
      makeData(adminActor),
      { id: "usr_existing_1" },
    )

    expect(res.status).toBe(200)
    expect(db._usersMap.get("usr_existing_1")?.password_hash).not.toBe("HASHED")
    expect(db._revokedSessions.length).toBeGreaterThan(0)
  })

  it("rejects a password shorter than eight characters", async () => {
    const db = createInMemoryUserDb()
    const res = await callHandler(
      onPasswordPost,
      new Request("http://localhost/api/admin/users/usr_existing_1/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "short" }),
      }),
      db,
      makeData(adminActor),
      { id: "usr_existing_1" },
    )

    expect(res.status).toBe(400)
  })
})
