# ADR-004 — Authentication and Session Architecture

## Decision Governance

- Created: 2026-09-26
- Last updated: 2026-09-26
- Owner: PENDING — technical owner not assigned
- Required approvers: PENDING — product owner, clinical lead, hospital security/privacy governance
- Approved by: PENDING
- Approval evidence: PENDING
- Decision date: PENDING
- Supersedes: None
- Superseded by: None
- Review date: PENDING

## Status

STAKEHOLDER DECISION REQUIRED

## Context

The Product Blueprint specifies:

- FR-01: User authentication via Username/NIP and password with an idle lock after 15 minutes of inactivity (`docs/AI-Product-Blueprint-*.md:98`).
- Security NFR: Communications over TLS/HTTPS, session security via HttpOnly Secure Cookies, 15-minute idle timeout, and isolated RBAC (`docs/AI-Product-Blueprint-*.md:150`).
- MVP Scope clause: Explicitly specifies "Auth JWT" (`docs/AI-Product-Blueprint-*.md:144`).
- UI Specification: Login screen with a "Remember Me" checkbox (`docs/AI-Product-Blueprint-*.md:250`).

The Architecture Audit (`docs/ARCHITECTURE-AUDIT.md:326-340`) identified that stateless JWT authentication contradicts the requirements for immediate session revocation, 15-minute server-enforced idle timeouts, role revocation, and account disabling.

## Problem

Define an authentication and session architecture for Cloudflare Pages Functions and D1 that:

1. Strictly enforces a 15-minute idle timeout across shared clinical workstations.
2. Supports immediate revocation upon logout, password change, account disabling, and role/unit modification.
3. Protects sensitive patient data from cross-site request forgery (CSRF) and script-based credential theft (XSS).
4. Minimizes operational and architectural complexity on edge serverless infrastructure.
5. Reconciles the Blueprint's literal "Auth JWT" specification with sound clinical security engineering.

## Constraints

- Runtime: Cloudflare Pages Functions (edge serverless V8 isolates).
- Database: Cloudflare D1 (distributed SQLite at edge/regional locations).
- Client: React 19 SPA running on modern desktop and tablet browsers in clinical environments (operating rooms, nurse stations).
- Environment: Shared clinical workstations where multiple clinicians use the same physical terminal throughout a shift.
- Compliance: Strict hospital confidentiality baseline; zero plaintext credential or token persistence in browser storage (`localStorage`, `sessionStorage`, `IndexedDB`).

---

## Detailed Evaluation of Architectural Options

### Option A — Server-Side Opaque Session in HttpOnly Cookie

- **Architecture:** The client receives a high-entropy random session identifier (128+ bits) stored in a `__Host-` prefixed HttpOnly, Secure cookie. Cloudflare D1 stores a keyed hash (SHA-256 digest) of the token along with user association, issuance time, last activity timestamp, absolute expiry, authentication version, and revocation status.
- **Credential & Session Storage:** No credentials or user claims are stored in the browser. D1 maintains a `sessions` table.
- **Revocation Model:** Immediate and deterministic. Deleting or setting `revoked_at` in the D1 record invalidates the session for the next incoming request.
- **Expiry:** Dual-timer: 15-minute sliding idle timeout and an absolute maximum session lifetime (e.g., 8–12 hours).
- **Idle Timeout:** Fully server-authoritative. Each incoming request checks `(now - last_seen_at) <= 15 minutes`. If exceeded, the session is rejected as expired.
- **Absolute Timeout:** Server enforces `(now - issued_at) <= absolute_lifetime` regardless of activity.
- **Concurrent Sessions:** Easily bounded and inspected. D1 queries can count and prune active sessions per user (e.g., maximum 3 concurrent sessions; "logout other sessions" capability).
- **Logout Behavior:** Immediate. The server revokes the D1 session record and clears the cookie via `Set-Cookie: ... Max-Age=0`.
- **Forced Logout:** Administrators or security policy can immediately revoke any or all active sessions for a target user ID.
- **Password Change Impact:** Increments user `auth_version` and bulk-revokes all existing sessions in D1.
- **Account Disable Impact:** Immediate. Next request query checks user `status = 'ACTIVE'`; if disabled, request is rejected with 401.
- **Browser Storage Requirements:** Zero client storage footprint. Prohibits `localStorage`/`sessionStorage` token retention.
- **CSRF Implications:** Required. Because cookies are sent automatically by browsers, state-changing requests must be protected with an anti-CSRF token (synchronizer token or custom header via SameSite=Strict plus Origin verification).
- **XSS Considerations:** Strong mitigation. JavaScript cannot read HttpOnly cookies, protecting the session token from exfiltration via XSS.
- **Cookie Requirements:** `__Host-session_id=...; Secure; HttpOnly; SameSite=Strict; Path=/`.
- **Server-Side Lookup Requirements:** Every authenticated request requires a fast index lookup in D1 for the session digest.
- **Operational Complexity:** Low to moderate. Requires a periodic or lazy cleanup job for expired session rows in D1.
- **D1 Implications:** Generates 1 read per authenticated API call; activity updates can be throttled (e.g., update `last_seen_at` at most once every 60 seconds) to prevent D1 write exhaustion.
- **Cloudflare Pages Functions Implications:** Native fit. Functions read cookie header, compute SHA-256 digest via Web Crypto API (`crypto.subtle.digest`), and query D1.
- **Audit Implications:** High audit fidelity. Session ID hash, user ID, client IP, and User-Agent can be logged and correlated with domain audit events.
- **Implementation Complexity:** Low. Standard session pattern with predictable failure modes.

### Option B — Pure Stateless JWT Authentication

- **Architecture:** The server signs a JSON Web Token containing `sub`, `role`, `unit`, `exp`, and `iat` using an asymmetric (RS256/EdDSA) or symmetric (HS256) secret via Web Crypto API. Token is returned to the client and stored either in a cookie or in memory.
- **Credential & Session Storage:** Claims are encoded in the token. No database table is maintained for sessions.
- **Revocation Model:** Extremely weak or non-existent without server state. A signed token remains valid until its `exp` timestamp passes.
- **Expiry:** Fixed expiration timestamp in token (`exp`).
- **Idle Timeout:** Cannot be reliably enforced server-side. A stateless JWT has a fixed expiry; sliding window idle timeout requires issuing a new JWT on every request, defeating caching and opening replay windows.
- **Absolute Timeout:** Tied directly to `exp`.
- **Concurrent Sessions:** Uncontrollable. The server cannot know how many valid JWTs exist for a user.
- **Logout Behavior:** Client-side only ("forget token"). If intercepted or retained in a browser cookie, the token remains valid on the server until `exp`.
- **Forced Logout:** Impossible without maintaining a server-side revocation denylist (which negates the stateless benefit).
- **Password Change Impact:** Existing tokens remain valid until expiration unless a server-side `auth_version` or token blacklisting table is queried on every request.
- **Account Disable Impact:** A disabled user can continue accessing APIs until their JWT expires, unless D1 is queried on every request.
- **Browser Storage Requirements:** If stored in cookie: same as Option A. If stored in `localStorage`: severe security violation (vulnerable to XSS theft).
- **CSRF Implications:** Same as Option A if cookie-based; eliminated if Authorization Bearer header is used, but Bearer tokens require JavaScript storage, increasing XSS risk.
- **XSS Considerations:** Catastrophic if stored in `localStorage` (full credential theft); protected if HttpOnly cookie is used.
- **Cookie Requirements:** `__Host-jwt=...; Secure; HttpOnly; SameSite=Strict; Path=/`.
- **Server-Side Lookup Requirements:** Zero DB lookups if purely stateless (at the cost of broken revocation and stale roles); requires DB lookup if revocation/account status is checked.
- **Operational Complexity:** Moderate. Requires key rotation management for signing keys.
- **D1 Implications:** Zero D1 reads/writes if purely stateless; identical D1 reads to Option A if user/revocation status is checked.
- **Cloudflare Pages Functions Implications:** Web Crypto verification is fast, but secret key management in Cloudflare environment variables is required.
- **Audit Implications:** Weak. Cannot determine whether an old token was legitimately logged out or stolen.
- **Implementation Complexity:** Moderate. Requires token signing, parsing, verification, and clock skew management.

### Option C — Hybrid Short-Lived Access Token + Stateful Refresh Token

- **Architecture:** The client receives a very short-lived JWT (e.g., 2–5 minutes) in an HttpOnly cookie or memory for API access, and a long-lived opaque refresh token stored in a separate HttpOnly cookie backed by D1. The refresh token rotates on each renewal.
- **Credential & Session Storage:** Access token holds transient claims; D1 stores refresh token families and session metadata.
- **Revocation Model:** Eventual revocation for access tokens (within 2–5 minutes); immediate revocation for refresh tokens.
- **Expiry:** Short access token expiration + sliding refresh token lifetime.
- **Idle Timeout:** Enforced at refresh token renewal boundaries. If client is idle for >15 minutes, refresh token renewal fails.
- **Absolute Timeout:** Enforced via refresh session metadata in D1.
- **Concurrent Sessions:** Supported via refresh session tracking in D1.
- **Logout Behavior:** Refresh token is revoked immediately in D1; access token expires within 2–5 minutes.
- **Forced Logout:** Revokes refresh token immediately; access token remains valid for remaining minutes of its short lifespan.
- **Password Change Impact:** Revokes all refresh tokens; active access tokens expire within minutes.
- **Account Disable Impact:** User cannot refresh; active access token expires within minutes.
- **Browser Storage Requirements:** Dual HttpOnly cookies (`__Host-access_token` and `__Host-refresh_token`).
- **CSRF Implications:** Required for both access endpoints and refresh endpoints.
- **XSS Considerations:** Strong if dual cookies are HttpOnly.
- **Cookie Requirements:** Two separate secure HttpOnly cookies with distinct paths or names.
- **Server-Side Lookup Requirements:** Access token verified via crypto (no DB lookup); refresh endpoint performs D1 lookup and update.
- **Operational Complexity:** High. Requires token rotation, race condition handling on simultaneous refreshes, replay detection, and cleanup jobs.
- **D1 Implications:** Reduces D1 session reads compared to Option A, but increases write load during token rotation bursts.
- **Cloudflare Pages Functions Implications:** Complex edge choreography for token refresh, rotation, and concurrent tab synchronization.
- **Audit Implications:** Moderate. Access token requests are not individually tracked against D1 session records.
- **Implementation Complexity:** High. High engineering overhead and debugging surface on serverless edge.

---

## Comparison Summary

| Evaluation Criteria           | Option A: Server-Side Opaque Session                        | Option B: Pure Stateless JWT     | Option C: Hybrid Access + Refresh         |
| ----------------------------- | ----------------------------------------------------------- | -------------------------------- | ----------------------------------------- |
| **15-Minute Idle Timeout**    | **Strong & Server-Authoritative**                           | Impossible server-side           | Bounded to refresh interval (2–5 min lag) |
| **Immediate Revocation**      | **Immediate (0s)**                                          | Impossible without DB denylist   | Eventual (2–5 min window)                 |
| **Account Disable Reaction**  | **Immediate (0s)**                                          | Stale until JWT expiry           | Stale for up to 5 minutes                 |
| **Role Change Reaction**      | **Immediate (0s)**                                          | Stale until JWT expiry           | Stale for up to 5 minutes                 |
| **Shared Workstation Safety** | **Highest (strict cookie purge + D1 kill)**                 | Low (tokens linger until exp)    | Moderate                                  |
| **No localStorage PHI/Token** | **Compliant**                                               | Only if cookie used              | Compliant                                 |
| **CSRF Protection Needed**    | Yes (`SameSite=Strict` + CSRF Token)                        | Yes (if cookie) / No (if Bearer) | Yes                                       |
| **Edge Serverless Fit**       | **Clean (Web Crypto digest + D1 read)**                     | Clean (Web Crypto verify)        | Complex (race conditions on refresh)      |
| **D1 Write Load**             | Low (throttled activity update)                             | Zero                             | Moderate (frequent token rotation writes) |
| **Implementation Complexity** | **Low / Maintainable**                                      | Moderate                         | High                                      |
| **Blueprint MVP Alignment**   | **Requires deviation approval** (Blueprint says "Auth JWT") | Matches literal text             | Partial match                             |

---

## Proposed Technical Recommendation

**Option A (Server-Side Opaque Session in HttpOnly Cookie)** is strongly recommended from a clinical security and operational standpoint.

However, because the Product Blueprint explicitly specifies **"Auth JWT"** (`docs/AI-Product-Blueprint-*.md:144`), implementing Option A constitutes an intentional architecture deviation that **MUST NOT BE FINALIZED WITHOUT STAKEHOLDER APPROVAL**.

If stakeholders mandate literal compliance with the Blueprint's JWT requirement, **Option C** must be selected as the only viable alternative that provides acceptable clinical security, accepting its higher edge complexity. **Option B is rejected** due to its inability to enforce immediate revocation and idle timeouts on shared clinical terminals.

## Consequences

### Positive

- Clinical records are protected by deterministic, server-enforced 15-minute idle expirations.
- Disabled staff accounts and revoked roles take effect instantly.
- Shared workstations are protected against post-logout session resuscitation.
- Implementation on Cloudflare Pages Functions and D1 is direct, auditable, and maintainable.

### Negative

- Requires a formal stakeholder decision to approve the departure from literal "Auth JWT" text in the Blueprint.
- Generates D1 read operations for authenticated requests (mitigated by D1 edge read replication and session caching).

## Security Impact

- Cookie: `__Host-session_id=...; Secure; HttpOnly; SameSite=Strict; Path=/`.
- Anti-CSRF: Synchronizer token passed in custom header `X-CSRF-Token` validated against session state on all unsafe HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`).
- Prohibits all credential/token storage in browser client-side storage APIs.

## Data Impact

Candidate `sessions` entity in D1 storing:

- `session_id_hash` (TEXT, PK, SHA-256 digest of cookie value)
- `user_id` (TEXT, FK to users)
- `issued_at` (TEXT UTC timestamp)
- `last_seen_at` (TEXT UTC timestamp)
- `expires_at` (TEXT UTC timestamp, absolute ceiling)
- `revoked_at` (TEXT UTC timestamp, nullable)
- `revocation_reason` (TEXT, nullable)
- `client_ip_hash` (TEXT, optional for anomaly detection)
- `user_agent_hash` (TEXT, optional for anomaly detection)

## Implementation Impact

Phase 04 establishes the contract and decision readiness. Phase 05 will implement the D1 schema and session management handlers **only after this ADR receives documented stakeholder approval**.

## Testing Impact

Mandatory test matrix upon implementation:

- Login sets `__Host-` Secure, HttpOnly, SameSite=Strict cookie.
- Idle timeout triggers 401 at `now > last_seen_at + 15m`.
- Absolute timeout triggers 401 at `now > issued_at + absolute_limit`.
- Logout immediately invalidates session in D1.
- Disabled user account returns 401 on next request with existing valid session cookie.
- Password change invalidates all other active sessions for that user.
- Missing or mismatched CSRF token on mutating method returns 403.

## Open Questions for Stakeholder Approval

1. Does the hospital product authority approve deviating from "Auth JWT" to "Server-Side Opaque Sessions"?
2. What is the approved maximum absolute session lifetime (recommendation: 8 hours, maximum 12 hours)?
3. What is the maximum number of concurrent active sessions allowed per user (recommendation: 2, or enforce single-session per user)?
4. Is "Remember Me" strictly limited to remembering the username/NIP string on trusted devices, with persistent authentication cookies completely prohibited (recommendation: YES)?

## Related Requirements

- FR-01 (`docs/AI-Product-Blueprint-*.md:98`)
- BR-02 (`docs/AI-Product-Blueprint-*.md:109`)
- Blueprint MVP Scope (`docs/AI-Product-Blueprint-*.md:144`)
- Security NFR (`docs/AI-Product-Blueprint-*.md:150`)
- Collective AC-01 s/d AC-05 (`docs/AI-Product-Blueprint-*.md:142-145`)
