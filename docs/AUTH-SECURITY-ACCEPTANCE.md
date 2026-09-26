# Authentication and Access Security Acceptance Criteria

## Status

# PROVISIONAL — PENDING ADR APPROVAL

These criteria constitute the security acceptance baseline for future Phase 05/06 implementation. They must be validated through automated tests before any identity or access feature is accepted into production.

---

## 1. Credential Security Criteria

| Criterion ID  | Requirement Statement                                                                                                                                                                                                    | Verification Method                                                                                                                | Status      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **AC-SEC-01** | User passwords must never be stored in plaintext or reversibly encrypted format under any circumstances. Storage must exclusively use adaptive one-way salted password hashes (Argon2id or PBKDF2 >=600,000 iterations). | Database inspection & D1 test harness assert zero plaintext credentials.                                                           | PROVISIONAL |
| **AC-SEC-02** | User passwords, password hashes, and raw password reset tokens must never appear in application logs, error payloads, stack traces, or console outputs.                                                                  | Automated unit tests on `functions/_shared/log-redaction.ts` and integration log verification.                                     | PROVISIONAL |
| **AC-SEC-03** | Credential data (`password`, `password_hash`, reset token values, MFA secrets) must never be returned in any API response payload, including user profile and user administration endpoints.                             | API schema assertion in contract tests verifying omission of credential fields from DTOs.                                          | PROVISIONAL |
| **AC-SEC-04** | A minimum password length of 12 characters must be enforced on creation and reset. Passphrases up to 128 characters must be accepted without truncation. Clipboard paste must not be blocked.                            | Client and server validation tests verifying rejection of <12 characters and acceptance of long passphrases.                       | PROVISIONAL |
| **AC-SEC-05** | Failed authentication attempts must return strictly uniform failure responses (`"Kredensial tidak valid"`) regardless of whether the username exists or the password was incorrect.                                      | Black-box API tests verifying identical status code (401) and identical error response payload for existing vs non-existing users. | PROVISIONAL |

---

## 2. Session Management Criteria

| Criterion ID  | Requirement Statement                                                                                                                                                                                                              | Verification Method                                                                                                | Status      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------- |
| **AC-SEC-06** | Authentication tokens, session identifiers, and clinical drafts must never be stored in browser `localStorage`, `sessionStorage`, or unencrypted client databases.                                                                 | Automated browser E2E test verifying web storage remains completely empty of session and patient data after login. | PROVISIONAL |
| **AC-SEC-07** | Session cookies must be issued with attributes: `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, and no `Domain` attribute.                                                                                    | Integration test asserting response headers on `POST /auth/login`.                                                 | PROVISIONAL |
| **AC-SEC-08** | A sliding idle timeout of exactly 15 minutes must be enforced by the server. Any authenticated request arriving where `now > last_seen_at + 15 minutes` must be rejected with HTTP 401.                                            | Time-mocked integration tests verifying success at 14m59s and rejection with 401 at 15m01s.                        | PROVISIONAL |
| **AC-SEC-09** | An absolute session lifetime ceiling (approved recommendation: 8–12 hours) must be enforced. Any request arriving where `now > issued_at + absolute_limit` must be rejected with HTTP 401 regardless of recent activity.           | Time-mocked integration tests asserting absolute expiry cutoff.                                                    | PROVISIONAL |
| **AC-SEC-10** | Explicit logout (`POST /auth/logout`) must immediately invalidate the session record on the server (setting `revoked_at` in D1) and clear the cookie. Subsequent requests with that session cookie must be rejected with HTTP 401. | Test executing logout then verifying immediate 401 on protected endpoint.                                          | PROVISIONAL |
| **AC-SEC-11** | An account marked `status = 'DISABLED'` in D1 must be blocked from initiating new sessions and all existing active sessions for that user must be rejected immediately upon their next request.                                    | Integration test asserting existing session returns 401 immediately after administrator disables account.          | PROVISIONAL |
| **AC-SEC-12** | A password change or successful password reset must immediately invalidate all existing sessions for that user across all devices.                                                                                                 | Integration test executing password change and verifying prior session cookie returns 401.                         | PROVISIONAL |
| **AC-SEC-13** | Concurrent sessions per user must be strictly bounded (recommendation: max 2). Exceeding the limit must revoke the oldest session or reject the new login based on approved policy.                                                | Integration test logging in N+1 times and verifying oldest session is revoked.                                     | PROVISIONAL |

---

## 3. Authorization Boundary Criteria

| Criterion ID  | Requirement Statement                                                                                                                                                                                                                | Verification Method                                                                                                              | Status      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **AC-SEC-14** | Authentication does not imply authorization. Every protected endpoint must independently evaluate actor role, organizational unit scope, resource ownership, and workflow state.                                                     | Negative authorization tests verifying authenticated `TENAGA_KESEHATAN` is denied access to PMKP review endpoints with HTTP 403. | PROVISIONAL |
| **AC-SEC-15** | Authorization must be enforced exclusively on the server in Cloudflare Pages Functions and D1 query predicates. Client-side route guards, hidden buttons, and disabled UI controls are strictly non-authoritative UX aids.           | Direct API tests bypassing frontend routing with various role sessions asserting strict 403/404 enforcement.                     | PROVISIONAL |
| **AC-SEC-16** | Unit scope must be enforced in database queries (`owning_unit_id == current_user_unit_id`). Knowing a valid incident ID belonging to another unit must never permit reading or mutating that incident.                               | IDOR/BOLA integration tests attempting cross-unit access by Head of Room returning 404/403.                                      | PROVISIONAL |
| **AC-SEC-17** | Administrators have zero default access to clinical incident narratives, patient medical records, or investigation findings. Administrator permissions are strictly limited to user management, master data, and operational health. | Negative authorization tests asserting `ADMINISTRATOR` session receives 403/404 when querying clinical incident endpoints.       | PROVISIONAL |

---

## 4. Cross-Site Request Forgery (CSRF) Criteria

| Criterion ID  | Requirement Statement                                                                                                                                                                 | Verification Method                                                                     | Status      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------- |
| **AC-SEC-18** | All unsafe HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) on cookie-authenticated endpoints must require a valid anti-CSRF token delivered via custom request header `X-CSRF-Token`. | Integration tests asserting mutating request without `X-CSRF-Token` returns HTTP 403.   | PROVISIONAL |
| **AC-SEC-19** | Requests with missing, malformed, or mismatched anti-CSRF tokens must be rejected with HTTP 403 before any business logic or database transaction is initiated.                       | Negative CSRF tests verifying zero state change in D1 on CSRF token mismatch.           | PROVISIONAL |
| **AC-SEC-20** | `Origin` and `Sec-Fetch-Site` request headers must be validated against the application's canonical origin; cross-origin mutating requests must be rejected.                          | Integration test with cross-origin `Origin: https://malicious.test` asserting HTTP 403. | PROVISIONAL |

---

## 5. Logging and Sensitive Data Criteria

| Criterion ID  | Requirement Statement                                                                                                                                                                                                                                                      | Verification Method                                                            | Status      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------- |
| **AC-SEC-21** | Application logs must pass through `functions/_shared/log-redaction.ts`. Passwords, session cookies, bearer tokens, CSRF tokens, patient names, medical record numbers, and clinical chronology must be replaced with `[REDACTED]`.                                        | Automated unit tests covering all recursive and nested sensitive key patterns. | PROVISIONAL |
| **AC-SEC-22** | Application error responses (`application/problem+json`) must return sanitized machine error codes and localized error messages. They must never disclose database error strings, internal SQL queries, file system paths, or Cloudflare isolate details.                  | Error handler unit/integration tests asserting clean problem details payload.  | PROVISIONAL |
| **AC-SEC-23** | Every authentication and security-relevant event (login, logout, failed attempt, session revocation, password change, account disable) must produce an auditable log entry containing Request ID, server timestamp, actor, and outcome without exposing sensitive secrets. | Integration test verifying audit log emission on authentication events.        | PROVISIONAL |

---

## 6. Review Gate

These acceptance criteria are submitted for stakeholder review. They must be ratified alongside ADR-004 and ADR-018 before Phase 05 begins.
