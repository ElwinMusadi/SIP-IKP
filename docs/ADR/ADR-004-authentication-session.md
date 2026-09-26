# ADR-004 — Authentication and Session Architecture

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

The Blueprint combines JWT stateless verification, secure cookies, idle timeout, Remember Me, logout, reset, account disablement, and role changes.

## Problem

Choose a revocable session design that reliably enforces 15-minute inactivity on Pages Functions.

## Constraints

HttpOnly Secure cookies, server authorization, no localStorage credentials, low operational complexity, and current D1 platform.

## Options Considered

### Option A — JWT access token in HttpOnly cookie

Low state, but reliable idle/revocation and current-role checks require added server state.

### Option B — Server-side opaque session

Immediate revocation and clear activity semantics with moderate D1 lifecycle work.

### Option C — Short-lived access token plus rotating refresh session

Capable but adds replay, rotation, and multi-token complexity.

## Decision

Recommend Option B. Cookie contains a random opaque token; D1 stores only its digest and lifecycle metadata. This changes the Blueprint's JWT implementation detail and therefore requires approval.

## Rationale

It best satisfies idle timeout, logout, disablement, password reset, role change, and auditability with minimal moving parts.

## Consequences

### Positive

Server-authoritative revocation and authorization state.

### Negative

Session storage, activity update throttling, cleanup, and D1 availability dependency.

## Security Impact

Use host-only `__Host-` Secure HttpOnly SameSite=Strict cookie; CSRF token plus Origin/Fetch Metadata; rotate on login/elevation; no credentials in JS storage.

## Data Impact

Session digest, user, activity, absolute expiry, auth version, and revocation metadata.

## Implementation Impact

Phase 04 implements lifecycle; Phase 03 session table waits for approval.

## Testing Impact

Idle boundary, logout, disablement, reset, role change, fixation, CSRF, concurrency, and replay tests.

## Open Questions

Absolute lifetime; concurrent-session count; MFA; Remember Me (recommended username-only); activity definition.

## Related Requirements

FR-01; MVP JWT statement; Security NFR. No individual AC maps session behavior.
