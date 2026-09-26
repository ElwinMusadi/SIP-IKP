import { describe, expect, it, vi } from "vitest"

import type { CloudflareEnv } from "../../../src/types/cloudflare-env"
import { hashPassword } from "../../_shared/password"
import type { RequestContextData } from "../../_shared/request-context"
import { onRequestPost as onLoginPost } from "./login"
import { onRequestPost as onLogoutPost } from "./logout"
import { onRequestGet as onSessionGet } from "./session"

type LoginContext = Parameters<typeof onLoginPost>[0]
type LogoutContext = Parameters<typeof onLogoutPost>[0]
type SessionContext = Parameters<typeof onSessionGet>[0]

interface TestUser {
  id: string
  username: string
  password_hash: string
  full_name: string
  role: "TENAGA_KESEHATAN" | "KEPALA_RUANGAN" | "KOMITE_PMKP" | "ADMINISTRATOR"
  profession: string
  unit_id: string
  is_active: number
}

interface TestSession {
  id: string
  user_id: string
  token_hash: string
  csrf_token: string
  issued_at: string
  last_seen_at: string
  expires_at: string
  revoked_at: string | null
  revocation_reason: string | null
}

function createMockD1Database(initialUsers: TestUser[] = []) {
  const users = [...initialUsers]
  const sessions: TestSession[] = []

  return {
    users,
    sessions,
    db: {
      prepare(sql: string) {
        let boundParams: unknown[] = []
        return {
          bind(...params: unknown[]) {
            boundParams = params
            return this
          },
          async first<T = Record<string, unknown>>() {
            if (sql.includes("FROM users") && sql.includes("username = ?")) {
              const username = boundParams[0] as string
              const found = users.find((u) => u.username === username)
              return (found ? { ...found } : null) as T | null
            }
            if (sql.includes("FROM sessions") && sql.includes("token_hash = ?")) {
              const tokenHash = boundParams[0] as string
              const foundSession = sessions.find(
                (s) => s.token_hash === tokenHash && s.revoked_at === null,
              )
              if (!foundSession) return null
              const foundUser = users.find(
                (u) => u.id === foundSession.user_id && u.is_active === 1,
              )
              if (!foundUser) return null
              return {
                session_id: foundSession.id,
                user_id: foundUser.id,
                csrf_token: foundSession.csrf_token,
                issued_at: foundSession.issued_at,
                last_seen_at: foundSession.last_seen_at,
                expires_at: foundSession.expires_at,
                revoked_at: foundSession.revoked_at,
                username: foundUser.username,
                full_name: foundUser.full_name,
                role: foundUser.role,
                profession: foundUser.profession,
                unit_id: foundUser.unit_id,
                is_active: foundUser.is_active,
              } as T
            }
            return null
          },
          async run() {
            if (sql.includes("INSERT INTO sessions")) {
              const [id, userId, tokenHash, csrfToken, issuedAt, lastSeenAt, expiresAt] =
                boundParams as [string, string, string, string, string, string, string]
              sessions.push({
                id,
                user_id: userId,
                token_hash: tokenHash,
                csrf_token: csrfToken,
                issued_at: issuedAt,
                last_seen_at: lastSeenAt,
                expires_at: expiresAt,
                revoked_at: null,
                revocation_reason: null,
              })
              return { meta: { changes: 1 } }
            }
            if (sql.includes("UPDATE sessions") && sql.includes("revoked_at = ?")) {
              const [revokedAt, reason, tokenHash] = boundParams as [string, string, string]
              const session = sessions.find((s) => s.token_hash === tokenHash)
              if (session) {
                session.revoked_at = revokedAt
                session.revocation_reason = reason
                return { meta: { changes: 1 } }
              }
              return { meta: { changes: 0 } }
            }
            if (sql.includes("UPDATE sessions") && sql.includes("last_seen_at = ?")) {
              const [lastSeenAt, sessionId] = boundParams as [string, string]
              const session = sessions.find((s) => s.id === sessionId)
              if (session) {
                session.last_seen_at = lastSeenAt
                return { meta: { changes: 1 } }
              }
              return { meta: { changes: 0 } }
            }
            return { meta: { changes: 0 } }
          },
        }
      },
    } as unknown as D1Database,
  }
}

describe("Authentication API Handlers (/api/auth/*)", () => {
  it("rejects login with missing username or password", async () => {
    const { db } = createMockD1Database()
    const request = new Request("https://example.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "nakes_ibs" }),
    })
    const data: RequestContextData = { requestId: "req_test" }

    const response = await onLoginPost({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data,
      functionPath: "functions/api/auth/login.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as LoginContext)

    expect(response.status).toBe(400)
    const body: { code?: string } = await response.json()
    expect(body.code).toBe("VALIDATION_ERROR")
  })

  it("rejects login with invalid credentials using uniform failure response", async () => {
    const passwordHash = await hashPassword("CorrectPassword#123")
    const { db } = createMockD1Database([
      {
        id: "usr_1",
        username: "valid_user",
        password_hash: passwordHash,
        full_name: "Valid User",
        role: "TENAGA_KESEHATAN",
        profession: "Perawat",
        unit_id: "IBS",
        is_active: 1,
      },
    ])

    const request = new Request("https://example.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "valid_user", password: "WrongPassword#999" }),
    })
    const data: RequestContextData = { requestId: "req_test" }

    const response = await onLoginPost({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data,
      functionPath: "functions/api/auth/login.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as LoginContext)

    expect(response.status).toBe(401)
    const body: { code?: string } = await response.json()
    expect(body.code).toBe("INVALID_CREDENTIALS")
  })

  it("authenticates valid credentials, sets secure cookie, and returns user profile + csrf token", async () => {
    const passwordHash = await hashPassword("NakesIbs#2026")
    const { db } = createMockD1Database([
      {
        id: "usr_nakes",
        username: "nakes_ibs",
        password_hash: passwordHash,
        full_name: "Ns. Maria",
        role: "TENAGA_KESEHATAN",
        profession: "Perawat Bedah",
        unit_id: "IBS",
        is_active: 1,
      },
    ])

    const request = new Request("https://example.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "nakes_ibs", password: "NakesIbs#2026" }),
    })
    const data: RequestContextData = { requestId: "req_test" }

    const response = await onLoginPost({
      request,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data,
      functionPath: "functions/api/auth/login.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as LoginContext)

    expect(response.status).toBe(200)
    const setCookie = response.headers.get("Set-Cookie")
    expect(setCookie).toContain("__Host-session_id=")
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie).toContain("SameSite=Strict")

    const body: {
      data: {
        user: { id: string; username: string; role: string }
        session: { csrfToken: string; idleExpiresInSeconds: number }
      }
    } = await response.json()
    expect(body.data.user.username).toBe("nakes_ibs")
    expect(body.data.user.role).toBe("TENAGA_KESEHATAN")
    expect(body.data.session.csrfToken).toBeDefined()
    expect(body.data.user.username).toBe("nakes_ibs")
    expect(body.data.user.role).toBe("TENAGA_KESEHATAN")
    expect(body.data.session.csrfToken).toBeDefined()
  })

  it("retrieves active session via GET /api/auth/session", async () => {
    const passwordHash = await hashPassword("NakesIbs#2026")
    const { db } = createMockD1Database([
      {
        id: "usr_nakes",
        username: "nakes_ibs",
        password_hash: passwordHash,
        full_name: "Ns. Maria",
        role: "TENAGA_KESEHATAN",
        profession: "Perawat Bedah",
        unit_id: "IBS",
        is_active: 1,
      },
    ])

    // First login to generate session
    const loginReq = new Request("https://example.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "nakes_ibs", password: "NakesIbs#2026" }),
    })
    const loginRes = await onLoginPost({
      request: loginReq,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data: { requestId: "req_1" },
      functionPath: "functions/api/auth/login.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as LoginContext)

    const cookieHeader = loginRes.headers.get("Set-Cookie")?.split(";")[0] ?? ""

    // Now query session with cookie
    const sessionReq = new Request("https://example.test/api/auth/session", {
      method: "GET",
      headers: { Cookie: cookieHeader },
    })
    const sessionRes = await onSessionGet({
      request: sessionReq,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data: { requestId: "req_2" },
      functionPath: "functions/api/auth/session.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as SessionContext)

    expect(sessionRes.status).toBe(200)
    const sessionBody: {
      data: { user: { username: string } }
    } = await sessionRes.json()
    expect(sessionBody.data.user.username).toBe("nakes_ibs")
  })

  it("revokes session via POST /api/auth/logout and clears cookie", async () => {
    const passwordHash = await hashPassword("NakesIbs#2026")
    const { db } = createMockD1Database([
      {
        id: "usr_nakes",
        username: "nakes_ibs",
        password_hash: passwordHash,
        full_name: "Ns. Maria",
        role: "TENAGA_KESEHATAN",
        profession: "Perawat Bedah",
        unit_id: "IBS",
        is_active: 1,
      },
    ])

    const loginReq = new Request("https://example.test/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "nakes_ibs", password: "NakesIbs#2026" }),
    })
    const loginRes = await onLoginPost({
      request: loginReq,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data: { requestId: "req_1" },
      functionPath: "functions/api/auth/login.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as LoginContext)
    const cookieHeader = loginRes.headers.get("Set-Cookie")?.split(";")[0] ?? ""

    // Logout
    const logoutReq = new Request("https://example.test/api/auth/logout", {
      method: "POST",
      headers: { Cookie: cookieHeader },
    })
    const logoutRes = await onLogoutPost({
      request: logoutReq,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data: { requestId: "req_2" },
      functionPath: "functions/api/auth/logout.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as LogoutContext)

    expect(logoutRes.status).toBe(200)
    const clearCookie = logoutRes.headers.get("Set-Cookie")
    expect(clearCookie).toContain("Max-Age=0")

    // Subsequent session query returns 401
    const sessionReq = new Request("https://example.test/api/auth/session", {
      method: "GET",
      headers: { Cookie: cookieHeader },
    })
    const sessionRes = await onSessionGet({
      request: sessionReq,
      env: { DB: db, APP_ENV: "test" } as unknown as CloudflareEnv,
      params: {},
      data: { requestId: "req_3" },
      functionPath: "functions/api/auth/session.ts",
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      async next() {
        return new Response(null)
      },
    } as unknown as SessionContext)
    expect(sessionRes.status).toBe(401)
  })
})
