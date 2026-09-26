# ADR-008 — E-Paraf and Digital Attribution

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

BR-07 asserts legal replacement of wet paraf through user audit data, but no hospital/legal approval evidence or assurance standard is stored.

## Problem

Implement trustworthy attribution without making unsupported electronic-signature claims.

## Constraints

Actor identity, intent, server timestamp, record locking, historical profile changes, credential compromise, and formal PDF display.

## Options Considered

### Option A — User ID plus timestamp

Insufficient historical and intent evidence.

### Option B — Authenticated attribution plus explicit approval evidence

Captures identity snapshot, object/version, action intent, confirmation, state, and server time.

### Option C — Formal electronic-signature infrastructure

May offer stronger legal assurance but requires policy/legal requirements and infrastructure not defined.

## Decision

Recommend Option B technically. Call it authenticated attribution/digital approval until stakeholders approve legal-signature terminology. Option C is deferred pending policy.

## Rationale

It provides auditable evidence without inventing legal validity.

## Consequences

### Positive

Stable historical attribution and explicit intent.

### Negative

Does not by itself prove legal equivalence to wet signatures.

## Security Impact

Snapshot full name, NIP/NRP, role, profession/title, unit, server time, action, target version, session assurance, and request ID. Re-authentication recommended for high-impact actions.

## Data Impact

Audit/approval records must not depend solely on mutable user joins.

## Implementation Impact

Confirmation text/version and re-authentication policy are needed before approvals/PDF.

## Testing Impact

Identity snapshot, intent, timestamp, lock, role-change, revoked/compromised account, and PDF evidence tests.

## Open Questions

Legal status; MFA/re-auth actions; invalidity/compromise annotation; retention; PDF wording.

## Related Requirements

FR-03, FR-04, FR-05, FR-07; BR-07; collective AC PDF attribution item.
