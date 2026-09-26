# Authentication and Identity API Contract

## 1. Scope and Status

# STATUS: PROPOSED / PROVISIONAL — NOT AN ACTIVE WIRE CONTRACT

This document specifies the candidate API contract for identity, session, and credential management in the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

This is a **design specification and readiness document**, not an implemented production contract. No authentication endpoint is active in Phase 04. Handlers will only be implemented after ADR-004 and ADR-018 receive formal stakeholder approval.

---

## 2. Common Protocol Conventions

- **Base Path:** `/api/v1/auth`
- **Content-Type:** `application/json; charset=utf-8` for all request and response bodies.
- **Error Format:** `application/problem+json` compliant with RFC 9457.
- **Request Correlation:** Header `X-Request-ID` is returned on all responses.
- **CSRF Protection:** All mutating endpoints (`POST`) require header `X-CSRF-Token` when session cookies are used.
- **Cache Control:** All identity responses enforce `Cache-Control: no-store, private`.

---

## 3. Candidate Operations

### 3.1 `POST /api/v1/auth/login`

- **Purpose:** Authenticate staff using Username/NIP and password, establish a session, and issue anti-CSRF token.
- **Status:** PROPOSED
- **Authentication Required:** None (public authentication entrypoint).
- **Authorization Required:** None.
- **Rate Limiting:** Maximum 5 failed attempts per IP/minute; progressive delay after 5 consecutive failures per account; temporary lockout after 10 failures.
- **Request Body:**
  ```json
  {
    "username": "198501152010011002",
    "password": "ExampleStaffPassphrase#2026",
    "rememberMe": false
  }
  ```
  _(Note: `rememberMe` applies only to pre-filling the username on the local device; it never extends session idle timeout on clinical workstations)._
- **Response (200 OK):**
  - **Headers:**
    - `Set-Cookie: __Host-session_id=<token_128bit>; Secure; HttpOnly; SameSite=Strict; Path=/`
    - `X-Request-ID: <uuidv7>`
  - **Body:**
    ```json
    {
      "data": {
        "user": {
          "id": "usr_01923456789abcdef",
          "username": "198501152010011002",
          "displayName": "Ns. Maria G. Klau, S.Kep",
          "role": "TENAGA_KESEHATAN",
          "unit": {
            "id": "unt_ibs_001",
            "name": "Instalasi Bedah Sentral"
          }
        },
        "session": {
          "idleExpiresInSeconds": 900,
          "csrfToken": "csrf_01923456789abcdef01234567"
        }
      },
      "meta": {
        "requestId": "req_01923456789abcdef"
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: Malformed JSON or missing required fields (`MALFORMED_REQUEST`).
  - `401 Unauthorized`: Invalid credentials, inactive account, or disabled account (`INVALID_CREDENTIALS`). Strictly uniform message.
  - `429 Too Many Requests`: Account temporarily locked or rate limit exceeded (`RATE_LIMITED`).
- **Session Effect:** Destroys any existing pre-auth session, creates a new active session record in D1, and issues fresh `__Host-` session cookie.
- **Audit Event:** `LOGIN_SUCCESS` (on success) or `LOGIN_FAILURE` (on failure, recording username, client IP, Request ID, reason code).

---

### 3.2 `POST /api/v1/auth/logout`

- **Purpose:** Terminate the active authenticated session immediately.
- **Status:** PROPOSED
- **Authentication Required:** Yes (valid active session cookie).
- **Authorization Required:** Any authenticated role.
- **Request Headers:**
  - `Cookie: __Host-session_id=...`
  - `X-CSRF-Token: <token>`
- **Request Body:** Empty or optional `{ "allDevices": false }`.
- **Response (200 OK):**
  - **Headers:**
    - `Set-Cookie: __Host-session_id=; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
    - `X-Request-ID: <uuidv7>`
  - **Body:**
    ```json
    {
      "data": {
        "loggedOut": true
      },
      "meta": {
        "requestId": "req_01923456789abcdef"
      }
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: Session missing or already expired (`AUTHENTICATION_REQUIRED`).
  - `403 Forbidden`: Invalid or missing anti-CSRF token (`CSRF_TOKEN_INVALID`).
- **Session Effect:** Sets `revoked_at = now` and `revocation_reason = 'USER_LOGOUT'` in D1 session table; expires client cookie.
- **Audit Event:** `LOGOUT` (recording user ID, session ID hash, timestamp, Request ID).

---

### 3.3 `GET /api/v1/auth/session`

- **Purpose:** Inspect current authentication state, verify active session validity, update sliding idle timer, and obtain refreshed CSRF token.
- **Status:** PROPOSED
- **Authentication Required:** Yes.
- **Authorization Required:** Any authenticated role.
- **Request Headers:**
  - `Cookie: __Host-session_id=...`
- **Response (200 OK):**
  ```json
  {
    "data": {
      "user": {
        "id": "usr_01923456789abcdef",
        "username": "198501152010011002",
        "displayName": "Ns. Maria G. Klau, S.Kep",
        "role": "TENAGA_KESEHATAN",
        "unit": {
          "id": "unt_ibs_001",
          "name": "Instalasi Bedah Sentral"
        }
      },
      "session": {
        "idleExpiresInSeconds": 840,
        "absoluteExpiresInSeconds": 28000,
        "csrfToken": "csrf_01923456789abcdef01234567"
      }
    },
    "meta": {
      "requestId": "req_01923456789abcdef"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Session missing, idle timed out (>15 min), or revoked (`SESSION_EXPIRED` or `AUTHENTICATION_REQUIRED`).
- **Session Effect:** Throttled update of `last_seen_at` in D1 (at most once every 60 seconds) to avoid database write fatigue.
- **Audit Event:** None for routine polling; `SESSION_EXPIRED` if rejected due to timeout.

---

### 3.4 `POST /api/v1/auth/session/revoke`

- **Purpose:** Administrative or user-initiated revocation of one or all active sessions for an account.
- **Status:** PROPOSED
- **Authentication Required:** Yes.
- **Authorization Required:** Owning user (for own sessions) or `ADMINISTRATOR` (for any user).
- **Request Headers:**
  - `Cookie: __Host-session_id=...`
  - `X-CSRF-Token: <token>`
- **Request Body:**
  ```json
  {
    "targetUserId": "usr_01923456789abcdef",
    "revokeAll": true,
    "reason": "USER_INITIATED_REMOTE_LOGOUT"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "data": {
      "revokedCount": 2
    },
    "meta": {
      "requestId": "req_01923456789abcdef"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Unauthenticated caller.
  - `403 Forbidden`: Non-admin user attempting to revoke sessions of another user.
- **Session Effect:** Sets `revoked_at = now` on matching active sessions in D1.
- **Audit Event:** `SESSION_REVOKED` (recording actor, target user, count, reason, Request ID).

---

### 3.5 `POST /api/v1/auth/password/change`

- **Purpose:** Authenticated staff member updates their own password.
- **Status:** PROPOSED
- **Authentication Required:** Yes.
- **Authorization Required:** Owning user.
- **Request Headers:**
  - `Cookie: __Host-session_id=...`
  - `X-CSRF-Token: <token>`
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword123456",
    "newPassword": "NewClinicalPassphrase#2026",
    "confirmNewPassword": "NewClinicalPassphrase#2026"
  }
  ```
- **Response (200 OK):**
  - **Headers:** Re-issues updated session cookie and CSRF token.
  - **Body:**
    ```json
    {
      "data": {
        "passwordChanged": true
      },
      "meta": {
        "requestId": "req_01923456789abcdef"
      }
    }
    ```
- **Error Responses:**
  - `400 Bad Request`: Password mismatch or validation failure (`VALIDATION_ERROR`).
  - `401 Unauthorized`: Current password verification failed (`INVALID_CREDENTIALS`).
  - `422 Unprocessable Entity`: Password policy violation (too short, common password, or reused from history).
- **Session Effect:** Increments user `auth_version`, updates D1 password hash, revokes all other sessions for this user, rotates current session.
- **Audit Event:** `PASSWORD_CHANGED` (recording user ID, Request ID, server timestamp).

---

### 3.6 `POST /api/v1/auth/password/reset/request`

- **Purpose:** Request a password recovery token (self-service or IT helpdesk initiated).
- **Status:** PROPOSED
- **Authentication Required:** None.
- **Authorization Required:** None.
- **Rate Limiting:** Maximum 3 requests per username/email per hour.
- **Request Body:**
  ```json
  {
    "identifier": "198501152010011002"
  }
  ```
- **Response (200 OK):**
  Strictly uniform response regardless of whether identifier exists:
  ```json
  {
    "data": {
      "message": "Jika akun terdaftar, instruksi pemulihan telah dikirimkan."
    },
    "meta": {
      "requestId": "req_01923456789abcdef"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing identifier.
  - `429 Too Many Requests`: Rate limit exceeded.
- **Session Effect:** Generates cryptographically random token, stores SHA-256 digest in D1 with 15-minute expiration.
- **Audit Event:** `PASSWORD_RESET_REQUESTED` (recording identifier hash, client IP, Request ID).

---

### 3.7 `POST /api/v1/auth/password/reset/complete`

- **Purpose:** Complete password reset using single-use cryptographic recovery token.
- **Status:** PROPOSED
- **Authentication Required:** None (validated via reset token).
- **Authorization Required:** None.
- **Request Body:**
  ```json
  {
    "token": "rst_01923456789abcdef0123456789abcdef",
    "newPassword": "NewSecureHospitalPassphrase#2026",
    "confirmNewPassword": "NewSecureHospitalPassphrase#2026"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "data": {
      "resetCompleted": true
    },
    "meta": {
      "requestId": "req_01923456789abcdef"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Token missing or password mismatch.
  - `401 Unauthorized` / `410 Gone`: Token invalid, expired, or already used (`TOKEN_INVALID`).
  - `422 Unprocessable Entity`: Password policy violation.
- **Session Effect:** Marks token `used_at = now`, updates password hash, increments `auth_version`, revokes all active sessions for that user.
- **Audit Event:** `PASSWORD_RESET_COMPLETED` (recording user ID, Request ID, server timestamp).

---

## 4. HTTP Status Code Semantics for Identity

| Status Code                   | Meaning in Identity Context                                                             | Client Action                                            |
| ----------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **200 OK**                    | Authentication or session operation succeeded.                                          | Consume payload; update local session expiration timers. |
| **400 Bad Request**           | Request syntax error, malformed JSON, or missing parameters.                            | Fix request format before retrying.                      |
| **401 Unauthorized**          | Authentication credentials absent, invalid, expired, or session revoked.                | Redirect to login screen; clear in-memory user state.    |
| **403 Forbidden**             | Authenticated user lacks permission for target resource/action, or CSRF token mismatch. | Display access denied message; do not redirect to login. |
| **404 Not Found**             | Target user, session, or resource ID does not exist or is concealed for security.       | Inform user resource is unavailable.                     |
| **409 Conflict**              | State conflict (e.g., account already active, concurrent password modification).        | Refresh state and retry.                                 |
| **412 Precondition Failed**   | Stale ETag or resource version during profile or credential update.                     | Fetch fresh version and reapply change.                  |
| **422 Unprocessable Entity**  | Business or validation rule violation (e.g., password does not meet complexity).        | Highlight specific field error in UI.                    |
| **428 Precondition Required** | Mutating request missing required concurrency header (`If-Match`).                      | Resend request with required header.                     |
| **429 Too Many Requests**     | Rate limit or lockout threshold exceeded.                                               | Back off; display countdown timer to user.               |
| **500 Internal Server Error** | Unexpected serverless isolate failure or unhandled exception.                           | Display generic technical error with Request ID.         |

---

## 5. Security & Rate Limiting Thresholds

| Operation                            | Rate Limit Key     | Threshold Window                | Policy on Breach                           |
| ------------------------------------ | ------------------ | ------------------------------- | ------------------------------------------ |
| `POST /auth/login`                   | IP Address         | 10 requests / 1 minute          | Block IP for 5 minutes (`429`)             |
| `POST /auth/login`                   | Account (Username) | 5 failed attempts / 5 minutes   | Exponential backoff (1s, 2s, 4s, 8s)       |
| `POST /auth/login`                   | Account (Username) | 10 failed attempts / 15 minutes | Lock account for 15 minutes (`429`)        |
| `POST /auth/password/reset/request`  | IP + Account       | 3 requests / 1 hour             | Reject further requests with `429`         |
| `POST /auth/password/reset/complete` | IP Address         | 5 requests / 15 minutes         | Invalidate token and require fresh request |
| `GET /auth/session`                  | Session ID         | 120 requests / 1 minute         | Rate limit polling abuse                   |
