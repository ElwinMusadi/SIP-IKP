# ADR-015 — Security Architecture Baseline

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

PROPOSED

## Context

Phase 01 introduced conservative headers, but identity, CSRF, rate limits, sensitive output, and logging are future work.

## Problem

Define the minimum layered control set without assuming header middleware alone secures clinical data.

## Constraints

Same-origin SPA/API, cookie sessions, Cloudflare edge, confidential content, exports, and private storage.

## Options Considered

### Option A — Platform defaults only

Insufficient explicit control/evidence.

### Option B — Layered application and edge baseline

Headers, HTTPS, authn/authz, CSRF, validation, encoding, limits, safe logs, secrets, caching, output controls.

### Option C — Add broad external security stack

Potentially useful later but premature and operationally heavier.

## Decision

Recommend Option B as detailed in `SECURITY-ARCHITECTURE.md`.

## Rationale

It is maintainable and fits the current Cloudflare architecture.

## Consequences

### Positive

Clear future gates and defense in depth.

### Negative

Requires continuous testing/refinement as assets, auth, and outputs are added.

## Security Impact

Keep/refine Phase 01 CSP, frame denial, MIME, referrer, permissions, no-store; add HSTS strategy, CORS deny-by-default, CSRF, rate limits, redaction, secrets, download/export controls.

## Data Impact

Minimal security/session/idempotency metadata; avoid logging PHI.

## Implementation Impact

Central middleware and safe defaults before business endpoints.

## Testing Impact

Headers, CSRF, CORS, XSS/output, validation, rate, cache, secret, log-redaction tests.

## Open Questions

HSTS domain governance, rate policies, CSP reporting, export controls, MFA.

## Related Requirements

FR-01, FR-06, FR-07; BR-02, BR-07; Security NFR.
