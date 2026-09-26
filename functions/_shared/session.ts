export const IDLE_TIMEOUT_SECONDS = 15 * 60 // 15 minutes
export const ABSOLUTE_TIMEOUT_SECONDS = 12 * 60 * 60 // 12 hours
const TOUCH_THROTTLE_SECONDS = 60 // 1 minute

export const SESSION_COOKIE_NAME = "session_id"
export const SECURE_SESSION_COOKIE_NAME = "__Host-session_id"
export const CSRF_HEADER_NAME = "X-CSRF-Token"

export interface UserSessionData {
  id: string
  userId: string
  csrfToken: string
  issuedAt: string
  lastSeenAt: string
  expiresAt: string
  revokedAt: string | null
  revocationReason: string | null
}

export interface AuthenticatedUser {
  id: string
  username: string
  fullName: string
  role: "TENAGA_KESEHATAN" | "KEPALA_RUANGAN" | "KOMITE_PMKP" | "ADMINISTRATOR"
  profession: string
  unitId: string
  isActive: boolean
}

export interface AuthSessionContext {
  user: AuthenticatedUser
  session: {
    id: string
    csrfToken: string
    idleExpiresInSeconds: number
    absoluteExpiresInSeconds: number
  }
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function generateSecureToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return bufferToHex(bytes)
}

export async function hashSessionToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token))
  return bufferToHex(digest)
}

export function parseSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie")
  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader.split(";").map((part) => part.trim())
  for (const cookie of cookies) {
    if (cookie.startsWith(`${SECURE_SESSION_COOKIE_NAME}=`)) {
      return cookie.slice(SECURE_SESSION_COOKIE_NAME.length + 1)
    }
    if (cookie.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      return cookie.slice(SESSION_COOKIE_NAME.length + 1)
    }
  }

  return null
}

export function serializeSessionCookie(token: string, isHttps = false): string {
  const name = isHttps ? SECURE_SESSION_COOKIE_NAME : SESSION_COOKIE_NAME
  const secureAttr = isHttps ? "; Secure" : ""
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${String(ABSOLUTE_TIMEOUT_SECONDS)}${secureAttr}`
}

export function serializeClearSessionCookie(isHttps = false): string {
  const name = isHttps ? SECURE_SESSION_COOKIE_NAME : SESSION_COOKIE_NAME
  const secureAttr = isHttps ? "; Secure" : ""
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureAttr}`
}

export async function createSession(
  db: D1Database,
  userId: string,
  now = new Date(),
): Promise<{ token: string; csrfToken: string; sessionId: string }> {
  const sessionId = crypto.randomUUID()
  const token = generateSecureToken(32)
  const csrfToken = generateSecureToken(16)
  const tokenHash = await hashSessionToken(token)

  const issuedAt = now.toISOString()
  const lastSeenAt = issuedAt
  const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_SECONDS * 1000).toISOString()

  await db
    .prepare(
      `INSERT INTO sessions (
        id, user_id, token_hash, csrf_token, issued_at, last_seen_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(sessionId, userId, tokenHash, csrfToken, issuedAt, lastSeenAt, expiresAt)
    .run()

  return { token, csrfToken, sessionId }
}

export async function validateSession(
  db: D1Database,
  token: string,
  now = new Date(),
): Promise<AuthSessionContext | null> {
  const tokenHash = await hashSessionToken(token)

  const result = await db
    .prepare(
      `SELECT
        s.id AS session_id,
        s.user_id,
        s.csrf_token,
        s.issued_at,
        s.last_seen_at,
        s.expires_at,
        s.revoked_at,
        u.username,
        u.full_name,
        u.role,
        u.profession,
        u.unit_id,
        u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND u.is_active = 1
      LIMIT 1`,
    )
    .bind(tokenHash)
    .first<{
      session_id: string
      user_id: string
      csrf_token: string
      issued_at: string
      last_seen_at: string
      expires_at: string
      revoked_at: string | null
      username: string
      full_name: string
      role: "TENAGA_KESEHATAN" | "KEPALA_RUANGAN" | "KOMITE_PMKP" | "ADMINISTRATOR"
      profession: string
      unit_id: string
      is_active: number
    }>()

  if (!result) {
    return null
  }

  const lastSeenTime = new Date(result.last_seen_at).getTime()
  const expiresTime = new Date(result.expires_at).getTime()
  const nowTime = now.getTime()

  // 15-minute sliding idle timeout check
  if (nowTime - lastSeenTime > IDLE_TIMEOUT_SECONDS * 1000) {
    // Mark as revoked due to idle timeout
    await db
      .prepare(
        `UPDATE sessions SET revoked_at = ?, revocation_reason = 'IDLE_TIMEOUT' WHERE id = ?`,
      )
      .bind(now.toISOString(), result.session_id)
      .run()
    return null
  }

  // Absolute session lifetime ceiling check
  if (nowTime > expiresTime) {
    await db
      .prepare(
        `UPDATE sessions SET revoked_at = ?, revocation_reason = 'ABSOLUTE_EXPIRY' WHERE id = ?`,
      )
      .bind(now.toISOString(), result.session_id)
      .run()
    return null
  }

  // Throttle database write: update last_seen_at at most once every 60s
  if (nowTime - lastSeenTime > TOUCH_THROTTLE_SECONDS * 1000) {
    await db
      .prepare(`UPDATE sessions SET last_seen_at = ? WHERE id = ?`)
      .bind(now.toISOString(), result.session_id)
      .run()
  }

  const remainingIdle = Math.max(
    0,
    Math.floor((lastSeenTime + IDLE_TIMEOUT_SECONDS * 1000 - nowTime) / 1000),
  )
  const remainingAbsolute = Math.max(0, Math.floor((expiresTime - nowTime) / 1000))

  return {
    user: {
      id: result.user_id,
      username: result.username,
      fullName: result.full_name,
      role: result.role,
      profession: result.profession,
      unitId: result.unit_id,
      isActive: Boolean(result.is_active),
    },
    session: {
      id: result.session_id,
      csrfToken: result.csrf_token,
      idleExpiresInSeconds: remainingIdle,
      absoluteExpiresInSeconds: remainingAbsolute,
    },
  }
}

export async function revokeSession(
  db: D1Database,
  token: string,
  reason = "USER_LOGOUT",
  now = new Date(),
): Promise<boolean> {
  const tokenHash = await hashSessionToken(token)
  const result = await db
    .prepare(
      `UPDATE sessions
       SET revoked_at = ?, revocation_reason = ?
       WHERE token_hash = ? AND revoked_at IS NULL`,
    )
    .bind(now.toISOString(), reason, tokenHash)
    .run()

  return result.meta.changes > 0
}

export async function revokeAllUserSessions(
  db: D1Database,
  userId: string,
  reason = "REVOKE_ALL",
  now = new Date(),
): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE sessions
       SET revoked_at = ?, revocation_reason = ?
       WHERE user_id = ? AND revoked_at IS NULL`,
    )
    .bind(now.toISOString(), reason, userId)
    .run()

  return result.meta.changes
}
