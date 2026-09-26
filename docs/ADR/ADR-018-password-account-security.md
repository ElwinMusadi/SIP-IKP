# ADR-018 — Password Security, Credential Lifecycle, and MFA

## Decision Governance

- Created: 2026-09-26
- Last updated: 2026-09-26
- Owner: PENDING — technical owner not assigned
- Required approvers: PENDING — product owner, hospital security officer, IT infrastructure lead
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

- FR-01: User authentication using Username/NIP and password; contains the phrase "Password terenkripsi" (`docs/AI-Product-Blueprint-*.md:98`).
- Conceptual Data Dictionary: Contains `users.password_hash` (`docs/AI-Product-Blueprint-*.md:212`).
- Operational Module: Mentions password reset (`docs/AI-Product-Blueprint-*.md:87`).
- Target Infrastructure: Cloudflare Pages Functions runtime (V8 isolates with Web Crypto API and WebAssembly support) and Cloudflare D1.

The Architecture Audit (`docs/ARCHITECTURE-AUDIT.md:338-340`, `docs/ARCHITECTURE-AUDIT.md:629-631`) identified that:

1. Reversible encryption is an insecure and inappropriate mechanism for storing passwords.
2. The term "password terenkripsi" must be formally corrected to one-way salted password hashing.
3. Key credential management decisions remain unapproved: algorithm selection, work factors, password complexity rules, lockout policies, reset protocols, and multi-factor authentication (MFA).

## Problem

Define a credential security and account lifecycle policy that:

1. Employs cryptographically robust, adaptive one-way password hashing compatible with the Cloudflare serverless edge runtime.
2. Establishes enforceable password policies appropriate for hospital staff without encouraging insecure workarounds (e.g., sticky notes on shared terminals).
3. Defines a secure password change, password reset, and account lockout protocol.
4. Evaluates Multi-Factor Authentication (MFA) options and determines whether MFA should be mandatory, role-based, or deferred.
5. Operates cleanly on D1 without storing plaintext passwords or sensitive credential artifacts in application logs.

## Constraints

- Platform: Cloudflare Pages Functions (V8 WebAssembly and Web Crypto API).
- Storage: Cloudflare D1 (SQLite).
- User Population: Hospital staff (doctors, operating theater nurses, anesthesiologists, midwives, ward heads, PMKP committee members, administrators) accessing systems under shift pressure in clinical environments.
- Zero Hardcoded Credentials: No shared administrator passwords or static credentials in migrations, seeds, or repository files.

---

## Detailed Evaluation of Password Hashing Algorithms

### Option A — Reversible Password Encryption (REJECTED)

- **Evaluation:** Encrypting passwords reversibly (e.g., AES-GCM) means anyone possessing the database and decryption key can recover all user passwords in plaintext.
- **Decision:** **REJECTED.** Violates fundamental security engineering and hospital data protection principles. Replaced by one-way salted password hashing.

### Option B — Argon2id (RFC 9106) via WebAssembly

- **Evaluation:** Industry standard and gold standard for password hashing. Highly resistant to GPU and ASIC brute-force attacks via memory hardness.
- **Platform Fit:** In Cloudflare Pages Functions, Argon2id requires compiled WebAssembly (Wasm). Wasm execution adds CPU and memory overhead per login. Must be benchmarked on Cloudflare edge isolates to ensure execution completes well within CPU time limits (typically 50ms on free, 500ms on standard plans).
- **Parameters (Candidate):** Memory cost 19–64 MiB, time cost 2–3 iterations, parallelism 1 thread.

### Option C — PBKDF2-HMAC-SHA-256 via Native Web Crypto API

- **Evaluation:** Supported natively in the V8 runtime via `crypto.subtle.deriveBits` / `importKey`. Zero external Wasm dependencies, highly stable, and predictable execution performance.
- **Platform Fit:** Native performance on Cloudflare edge. However, it lacks memory hardness and is more susceptible to dedicated GPU/ASIC cracking arrays than Argon2id if the database hash dump is exfiltrated.
- **Parameters (Candidate):** Minimum 600,000 iterations (OWASP recommendation), unique 16+ byte cryptographically random salt per user.

### Proposed Technical Recommendation for Password Hashing

**Provisional Recommendation:** Use **Argon2id** if Wasm execution benchmarking on Cloudflare Pages Functions proves reliable and stays within edge CPU quotas. If Wasm introduces latency or isolate compatibility issues, fallback to **PBKDF2-HMAC-SHA-256 with >=600,000 iterations**.

Store the hash in PHC string format (e.g., `$argon2id$v=19$m=65536,t=3,p=1$...` or `$pbkdf2-sha256$i=600000$...`) so that algorithm versions and iteration counts are embedded with the record. Implement automatic rehashing on successful authentication whenever stored parameters are lower than current policy.

---

## Candidate Password Policy Requirements

The following requirements are submitted for stakeholder review and approval:

1. **Password Length & Structure:**
   - Minimum length: 12 characters (allow passphrases up to 128 characters).
   - Character composition: Do not enforce arbitrary character class rules (e.g., must include 1 uppercase, 1 special character) which lead to predictable substitutions (e.g., `Password123!`). Encourage multi-word passphrases.
   - Allow clipboard paste to support password managers.
2. **Breached & Common Password Screening:**
   - Prohibit common default passwords (e.g., `rsudjohannes`, `rumahsakit`, `admin12345`).
   - Check against a top-10,000 common password blacklist on creation/reset.
3. **Unique Salt & Pepper:**
   - Cryptographically random unique salt (minimum 16 bytes) generated via `crypto.getRandomValues()` per user.
   - Optional server-side pepper stored exclusively in Cloudflare Secrets (never in D1, never in repository).
4. **Password History:**
   - Prohibit reusing the immediate last 3 passwords upon change/reset.
5. **Rate Limiting & Account Lockout:**
   - Progressive delay and rate limiting on failed login attempts per account and IP.
   - After 5 consecutive failed attempts: introduce exponential delay (1s, 2s, 4s, 8s).
   - After 10 consecutive failed attempts: temporary account lock for 15 minutes, or require administrative unlock.
   - Failure messages must remain strictly uniform (`"Kredensial tidak valid"`) to prevent account enumeration.
6. **Password Change:**
   - Requires current password verification.
   - Upon successful change: increment user `auth_version`, update password hash, revoke all other active sessions for that user.
7. **Password Reset (Self-Service or Admin-Assisted):**
   - Self-service reset via single-use, high-entropy cryptographic token delivered through verified hospital channel (email/internal directory).
   - Token stored only as a SHA-256 hash in D1 with a 15-minute expiration.
   - Using a reset token immediately invalidates the token, increments `auth_version`, and revokes all active sessions.
   - Administrative reset sets a temporary password with `must_change_on_next_login = TRUE`.

---

## Detailed Evaluation of Multi-Factor Authentication (MFA) Options

The Blueprint does not state whether MFA is mandatory. The following options are submitted for stakeholder decision:

### Option 1 — No MFA for Initial Release (Single-Factor Password Only)

- **Security Implications:** Elevated risk of credential compromise, especially for privileged roles (`ADMINISTRATOR`, `KOMITE_PMKP`).
- **Operational Implications:** Simplest operational onboarding for clinical staff under shift work.
- **Recovery Implications:** Basic password reset protocol only.
- **Implementation Complexity:** Minimal.
- **D1 Implications:** Zero extra tables.

### Option 2 — Role-Based Mandatory MFA (PMKP & Administrator Only)

- **Security Implications:** Protects high-impact administrative and hospital-wide governance roles while keeping ward-level reporting frictionless for frontline nurses and surgeons.
- **Operational Implications:** Only a small group of users (~5–10 staff) must configure an authenticator app.
- **Recovery Implications:** Administrator can generate recovery codes or perform identity verification in person.
- **Implementation Complexity:** Moderate. Requires TOTP generation/verification logic.
- **D1 Implications:** Adds `mfa_secrets` table and recovery codes table.

### Option 3 — Hospital-Wide MFA via TOTP (All Roles)

- **Security Implications:** Highest baseline protection across all accounts.
- **Operational Implications:** Significant friction in emergency theater environments. If a nurse or anesthesiologist loses their mobile phone during an on-call shift, incident reporting is blocked.
- **Recovery Implications:** High administrative overhead for IT helpdesk in resetting MFA tokens for 100+ clinical staff.
- **Implementation Complexity:** Moderate.
- **D1 Implications:** Requires full enrollment, recovery, and backup flow.

### Option 4 — WebAuthn / Passkeys (Hardware Security Keys)

- **Security Implications:** Phishing-proof authentication.
- **Operational Implications:** Requires hardware security keys (e.g., YubiKey) or biometric hardware on every shared theater PC. Unrealistic without existing hospital hardware budget.
- **Recovery Implications:** Requires backup keys or complex administrative override.
- **Implementation Complexity:** High.
- **D1 Implications:** Requires WebAuthn credential public key storage and challenge tracking.

### Proposed Technical Recommendation for MFA

**Provisional Recommendation:** Adopt **Option 2 (Role-Based Mandatory MFA for `ADMINISTRATOR` and `KOMITE_PMKP` via TOTP)** for Phase 05/06 implementation. Frontline `TENAGA_KESEHATAN` and `KEPALA_RUANGAN` operate with single-factor password + strict 15-minute idle timeouts to prevent clinical friction during emergency surgical procedures.

Final MFA scope is **STAKEHOLDER DECISION REQUIRED**.

---

## Consequences

### Positive

- Replaces unscientific "password encryption" with modern adaptive hashing.
- Protects administrative and clinical oversight roles against credential stuffing.
- Establishes clear revocation linkage: credential change instantly terminates active sessions.

### Negative

- Requires runtime Wasm/CPU benchmarking on Cloudflare Pages Functions before finalizing algorithm selection.
- Role-based MFA requires IT operational readiness for user onboarding and recovery.

## Security Impact

- Passwords are never stored in plaintext, never logged, and never included in API error responses.
- Single-use reset tokens stored as SHA-256 digests.
- Rate limiting mitigates brute-force attacks on edge entry points.

## Data Impact

Candidate entities in D1:

- `user_credentials`: stores `password_hash`, `algorithm`, `password_updated_at`, `must_change_password`, `failed_login_count`, `locked_until`.
- `password_reset_tokens`: stores `token_hash`, `user_id`, `expires_at`, `used_at`.
- `user_mfa_credentials` (conditional): stores TOTP secret encrypted with Cloudflare KMS/pepper, recovery codes hash, enrolled timestamp.

## Testing Impact

Mandatory test matrix upon implementation:

- Correct password verifies successfully; incorrect password fails with uniform error.
- Consecutive failed attempts trigger exponential delay / lockout.
- Password change invalidates existing sessions.
- Reset token cannot be reused after first consumption.
- Expired reset token is rejected.
- Password hash in database matches approved PHC format and parameters.

## Open Questions for Stakeholder Approval

1. Does hospital governance approve **Argon2id (fallback PBKDF2-HMAC-SHA-256 >=600k iterations)** as the official password hashing standard?
2. Is MFA approved as **mandatory for `ADMINISTRATOR` and `KOMITE_PMKP`** and **optional/deferred for frontline clinical staff**?
3. What is the approved account lockout threshold (recommendation: 10 failed attempts triggers 15-minute lock)?
4. Who is authorized to perform administrative password resets and account unlocks?

## Related Requirements

- FR-01 (`docs/AI-Product-Blueprint-*.md:98`)
- Operational Module Authentication (`docs/AI-Product-Blueprint-*.md:87`)
- Conceptual Data Dictionary (`docs/AI-Product-Blueprint-*.md:212`)
- Security NFR (`docs/AI-Product-Blueprint-*.md:150`)
