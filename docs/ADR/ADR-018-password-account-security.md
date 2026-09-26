# ADR-018 — Password and Account Security

## Decision Governance

- Created: 2026-09-26
- Last updated: 2026-09-26
- Owner: PENDING — technical owner not assigned
- Required approvers: PENDING — product/clinical/security approvers depend on ADR
- Approved by: PENDING
- Approval evidence: PENDING
- Decision date: PENDING
- Supersedes: None
- Superseded by: None
- Review date: PENDING

## Status

STAKEHOLDER DECISION REQUIRED

## Context

FR-01 says “password terenkripsi,” while the conceptual user model correctly uses `password_hash`. No KDF, password policy, reset, rate limit, disablement, rehash, or MFA policy is approved.

## Problem

Define safe credential storage and account lifecycle compatible with Cloudflare Pages Functions.

## Constraints

Passwords must not be reversible; runtime support and KDF cost require benchmarking; account disable/reset must revoke sessions; hospital password/MFA policy is unknown.

## Options Considered

### Option A — Reversible encryption

Rejected. A database/key compromise reveals passwords and the approach is unsuitable for password verification.

### Option B — Argon2id password hashing

Preferred security properties if an audited Cloudflare-compatible implementation and parameters are validated.

### Option C — PBKDF2-HMAC-SHA-256 through Web Crypto

Native runtime compatibility and simpler operations, but parameters require current threat/performance benchmarking and may offer weaker GPU resistance than Argon2id.

## Decision

Use one-way salted adaptive password hashes. Prefer Option B subject to runtime/security validation; Option C is the fallback. Store algorithm/parameter metadata and rehash after successful authentication when policy strengthens. Exact algorithm parameters, minimum password policy, MFA, and recovery process require stakeholder approval before implementation.

## Rationale

This corrects terminology and provides migration capability without prematurely selecting untested parameters.

## Consequences

### Positive

No recoverable passwords, per-user salts, policy upgrades, session invalidation after credential events.

### Negative

KDF benchmarking and recovery/rate-limit operations are required.

## Security Impact

Uniform login errors; account/network rate limits; single-use short-lived reset token stored as digest; disablement and successful reset revoke all sessions; change rotates current session and revokes others; no passwords/hashes/tokens in logs. Optional pepper resides only in Cloudflare secrets.

## Data Impact

Password hash with algorithm/parameters/salt encoding, authentication version, change time; reset-token digest/expiry/use metadata; account active/disabled state.

## Implementation Impact

Phase 04 benchmarks KDF in target runtime, implements rehash and recovery, and never seeds shared production credentials.

## Testing Impact

Correct/incorrect password, timing/error uniformity, rate limit, reset reuse/expiry, disablement, session revocation, rehash upgrade, and secret/log-redaction tests.

## Open Questions

KDF/parameters; minimum length (recommend passphrase-friendly ≥12, subject to policy); compromised-password screening; MFA roles; lockout/delay; recovery operator; initial credential delivery; concurrent sessions.

## Related Requirements

FR-01. No BR or individual AC defines password policy.
