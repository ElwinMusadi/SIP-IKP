# Security Architecture

## 1. Security objectives

The system will process confidential patient-safety information. The baseline objectives are:

1. authenticate each actor;
2. authorize every resource action by role, organizational scope, ownership, and workflow state;
3. minimize exposure of patient data in browsers, logs, exports, and storage;
4. preserve evidence of consequential actions without making unsupported “tamper-proof” or legal-signature claims;
5. support revocation, account disablement, and a strict 15-minute idle timeout;
6. operate with low complexity on Cloudflare Pages Functions, D1, and private R2.

## 2. Authentication and session recommendation

### Options evaluated

| Option                                               | Idle timeout/revocation                                                            | Cloudflare fit                  | Complexity                                    | Main risk                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| JWT access token in HttpOnly cookie                  | Weak without server state; disabled account/role changes remain valid until expiry | Good cryptographic verification | Low initially, complexity moves to revocation | False assumption of stateless security                 |
| Server-side opaque session in HttpOnly cookie        | Strong; server can enforce activity, revoke, and refresh authorization             | Good with D1 session table      | Moderate and explicit                         | D1 read/write load and cleanup                         |
| Short-lived access token plus refresh/session record | Strong if refresh rotation/revocation is correct                                   | Technically viable              | Highest                                       | More token states and failure paths than project needs |

**Provisional recommendation — ADR-004 approval required:** server-side opaque session. The cookie contains only a high-entropy random session token; D1 stores a keyed hash/digest of the token and session metadata. This deliberately deviates from Blueprint's JWT implementation detail while satisfying FR-01 and the NFR more reliably. None of the lifecycle details below are an active implementation contract until Product and Security approve the deviation because MVP explicitly says “Auth JWT.”

### Session lifecycle

1. Login verifies normalized username/NIP and password hash using uniform failure messaging.
2. On success, rotate any pre-auth session and issue a new random opaque token.
3. Store session digest, user ID, created time, last-activity time, absolute expiry, authentication version, and revocation metadata.
4. For each protected request, validate cookie, active account, auth version, idle deadline, absolute deadline, and current role/unit assignments.
5. Update activity with bounded write frequency while calculating authorization from current server state.
6. Idle expiry occurs after **15 minutes without a qualifying authenticated request**. Client warning is UX only; server time is authoritative.
7. Logout revokes the server record before clearing the cookie.
8. Password change/reset, account disablement, security incident, or role-sensitive administrative action revokes sessions as defined below.

### Cookie policy

- Host-only cookie using `__Host-` prefix when deployed over HTTPS.
- `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`.
- No `Domain` attribute.
- Session identifier never appears in URL, localStorage, logs, analytics, or JavaScript.
- Cookie lifetime may not exceed server-side absolute expiry.
- Rotate token on login and privilege/assurance elevation to prevent fixation.

### CSRF

SameSite is defense-in-depth, not the sole control. State-changing same-origin API requests must also enforce Origin/Fetch Metadata policy and a CSRF token tied to the server session. Safe methods remain side-effect free.

### Remember Me

**Recommendation:** do not persist authentication on shared clinical workstations. “Remember Me” may remember only the username on an explicitly approved trusted device; it must not extend the 15-minute idle timeout. Persistent sessions require stakeholder security approval and a separate risk assessment.

### Multiple sessions

Default proposal: permit a small bounded number of concurrent sessions, expose “logout all sessions,” and revoke oldest sessions beyond the bound. Exact count is a security-policy decision.

## 3. Password security

- Store passwords only as password hashes, never reversible encrypted passwords.
- Preferred KDF: Argon2id if an audited, Cloudflare-compatible implementation is approved and operationally tested. Fallback: PBKDF2-HMAC-SHA-256 through Web Crypto with a project-approved iteration benchmark. The exact KDF/parameters require implementation validation, not guesswork in this phase.
- Use a unique cryptographically random salt per password; optional application pepper belongs in Cloudflare secrets, not D1.
- Minimum proposed policy: at least 12 characters, allow passphrases and paste/password managers, maximum safely bounded, reject known compromised/default credentials, and avoid arbitrary composition/periodic rotation rules unless hospital policy requires them.
- Rate-limit login/reset by account and network signal without exposing account existence.
- Reset uses a single-use, random, short-lived token stored as a digest. Successful reset increments an authentication version and revokes all sessions.
- Password change requires the current password or an approved recovery/elevated process; revoke other sessions and rotate the current session.
- Account disablement blocks login and invalidates all sessions immediately.
- Rehash on successful login when stored parameters are weaker than the current policy.
- Bootstrap administrator credentials must never be seeded as a shared/static production password.

**STAKEHOLDER DECISION REQUIRED:** MFA requirement for PMKP and Administrator, password length/lockout policy, reset operator/process, and selected KDF risk acceptance.

## 4. Draft persistence

### Options

- Browser local draft: resilient to transient network loss but unsafe on shared workstations and weakly auditable.
- Server-side draft: supports device continuity, access control, expiry, and auditability; requires authenticated availability.
- Hybrid: increases sync/conflict and local data-loss exposure.

**Recommendation:** server-side drafts are authoritative. Keep unsaved form data in memory only until autosave. Do not persist patient name, MR number, incident narrative, clinical details, or credentials in localStorage, sessionStorage, IndexedDB, service-worker cache, URL/query string, or browser analytics.

If a future approved offline mode is required, create a separate ADR and threat model. Cosmetic preferences and non-sensitive UI state may be locally persisted.

Abandoned-draft expiry and deletion periods are stakeholder policy. Expiry must never silently delete a submitted report.

## 5. Audit integrity

### Levels evaluated

| Level                                      | Capability                                                                  | Limitation                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1. Application append-only                 | Code does not expose update/delete                                          | Privileged code/DB access can alter records                              |
| 2. Restricted append-only plus enforcement | Dedicated insert path, least privilege, monitoring, no normal mutation APIs | D1 administrative access still exists                                    |
| 3. Hash chain                              | Tampering/reordering becomes detectable with anchored checkpoints           | More implementation and verification complexity; not immutable by itself |
| 4. External immutable sink                 | Strong independent retention/forensics                                      | Extra infrastructure, cost, operations, and policy                       |

**Provisional recommendation:** use restricted application append-only controls as the minimum compatible design: consequential domain mutation and audit insertion in one D1 transaction/batch, no application update/delete endpoint, least-privilege code paths, integrity checks, and monitoring of privileged deployment/access changes. This is not an accepted assurance level.

Hash chaining and/or an external immutable sink are **STAKEHOLDER DECISION REQUIRED** based on hospital audit/legal requirements. Until an option is accepted and verified, the only permitted claim is “append-only application audit trail”; do not claim tamper evidence, immutability, or tamper-proof behavior.

### Minimum audit event groups

- Authentication: login success, failed login, logout, session expiry/revocation, reset request/completion.
- Incident: draft create, formal submit, receive, grade, high-risk escalation, completion by unit.
- Investigation: start/version create, submit, revision request, revision create, resubmit.
- PMKP: review start, RCA decision, regrade, completion.
- Integrity: addendum, approved emergency MR correction, void/reopen if later approved.
- Data access/output: attachment upload/download/delete/quarantine, print, PDF, export.
- Administration: user create/disable, password reset administration, role/unit changes, master-data changes.

Audit payloads use IDs, action metadata, before/after state or safe field names; they must not duplicate patient narrative or passwords/tokens. Attribution snapshots include the approved identity fields needed historically.

## 6. Digital attribution and e-paraf

Three concepts are distinct:

1. **Authenticated attribution:** identifies the active account that issued a command.
2. **Digital approval action:** records intent, confirmation, server timestamp, object version, and resulting state.
3. **Electronic/legal signature:** depends on applicable policy/law and assurance controls not established in the repository.

The system can safely implement the first two. It must not label them legally equivalent to a signature/paraf until approved.

Recommended evidence for consequential approvals:

- immutable actor/user ID reference;
- snapshot of full name, NIP/NRP, role, profession/title, unit;
- server-issued UTC timestamp;
- action and target record/version;
- explicit confirmation text/version;
- previous and new state;
- session/authentication assurance context;
- request/correlation ID;
- result and optional reason/directive.

Re-authentication is recommended for completion, role change, password/security change, and any future void/reopen operation. Whether grading, investigation submission, and print require re-authentication is policy-dependent.

**STAKEHOLDER DECISION REQUIRED:** legal/policy status, assurance level, actions requiring re-authentication/MFA, attribution display on formal PDF, retention, and invalidity handling after compromised credentials. Later credential revocation does not erase a historically valid attribution; compromise status may require an appended annotation/investigation.

## 7. Web security controls

### Implemented in Phase 01

- CSP: `default-src 'self'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, `object-src 'none'`.
- `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- restrictive camera/geolocation/microphone `Permissions-Policy`.
- `Cache-Control: no-store` for HTML.
- same-origin `/api` architecture direction.
- secrets excluded from client variables and repository.

### Required in future phases

- **Proposed under ADR-015, not established hospital policy:** TLS-only production and HSTS at the Cloudflare edge after domain readiness; avoid premature preload without domain governance.
- CSP refinement with script/style/font/connect directives and violation reporting; do not weaken with broad `unsafe-inline` without documented need.
- default deny CORS. Same-origin needs no permissive CORS; explicitly allow only approved origins if integration appears.
- CSRF protections described above.
- Zod validation at every trust boundary plus D1 constraints; size/count limits and Unicode normalization.
- React/output encoding by default; no unsanitized HTML rendering.
- endpoint-specific rate limits for login, reset, state transitions, upload, download, and export.
- `Cache-Control: no-store, private` for patient/API/output responses; avoid public/CDN caching.
- safe content disposition, sanitized filenames, download authorization, short-lived delivery URLs, watermark policy, and audit for print/export.
- CSV formula-injection mitigation for cells beginning with spreadsheet control characters.
- Cloudflare encrypted secrets and rotation/runbook; no `VITE_` secrets.
- structured logging with allowlisted metadata and redaction; never log passwords, session cookies, reset tokens, full clinical narrative, or attachment content.

## 8. Attachment security position

Attachments are present in the conceptual model but absent from clear MVP functional requirements. Recommendation: defer uploads from initial MVP unless stakeholders explicitly confirm necessity.

If approved, require private R2, allowlisted types, claimed MIME plus magic-byte validation, conservative size/count limits, SHA-256 checksum, opaque object keys without patient identifiers, quarantine/scanning decision, authorization on every download, short-lived delivery, no-store, audit events, retention/legal-hold policy, and reconciliation described in `DATA-ARCHITECTURE.md`.

## 9. Observability separation

- Application logs: technical behavior, request ID, route template, status, latency; no PHI payloads.
- Security logs: authentication, authorization denial, rate limit, administrative security actions.
- Domain audit: durable business evidence linked to incidents/users.
- Metrics: aggregate counts/latencies/errors without patient identifiers.
- Error tracking: sanitized stack/error class/correlation ID; no request body by default.

Operational logs are not a substitute for domain audit records.

## 10. Stakeholder decisions required

1. Approve departure from Blueprint JWT to server-side opaque sessions.
2. Approve MFA, KDF, password/reset, session concurrency, and Remember Me policy.
3. Approve e-paraf/legal-signature status and assurance requirements.
4. Select the audit integrity option: restricted application append-only, hash-chain tamper evidence, external immutable sink, or an approved combination; also approve retention.
5. Approve draft expiry and deletion.
6. Approve attachment MVP scope and security/retention policy.
7. Approve print/export roles, masking, watermark, and physical handling.
8. Approve incident response, log retention, RPO, and RTO.

## 11. Related requirements

- FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-07
- BR-01, BR-02, BR-04, BR-07, BR-09
- NFR security statements in the Product Blueprint
