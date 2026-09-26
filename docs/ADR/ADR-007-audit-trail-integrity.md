# ADR-007 — Audit Trail Integrity

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

FR-06 calls the audit history immutable/tamper-proof, but an ordinary D1 table plus `db.batch()` only provides atomicity.

## Problem

Select an honest, sufficient integrity level for clinical workflow evidence.

## Constraints

D1 administrative access, low operations, forensic usefulness, unknown legal/audit assurance requirement.

## Options Considered

### Option A — Application append-only

No normal mutation endpoint; weakest privileged-tamper resistance.

### Option B — Restricted append-only plus enforcement/monitoring

Dedicated inserts, least privilege, no normal update/delete, integrity checks.

### Option C — Tamper-evident hash chain

Detects modification/reordering when checkpoints are protected; more complexity.

### Option D — External immutable sink

Strong independence; additional service, cost, retention, and operations.

## Decision

No integrity level is selected because this ADR requires stakeholder approval. Propose Option B as the minimum compatible operational control and preserve optional extension fields/interfaces for future Option C or D without claiming they are active. Do not finalize hash-chain/external-sink DDL or claim tamper-proof behavior until an option is accepted.

## Rationale

Restricted application append-only controls are proportionate and maintainable as a proposed minimum; stronger tamper evidence depends on policy approval.

## Consequences

### Positive

Reliable business history with atomic domain/audit mutation.

### Negative

Privileged D1 tampering is not cryptographically impossible/detectable without higher level.

## Security Impact

No update/delete APIs; monitor privileged actions; redact clinical payloads/secrets.

## Data Impact

Actor snapshots, event/action, object/version, before/new states, reason, request ID, server time, optional future chain fields.

## Implementation Impact

Central audit writer in command transactions and integrity verification tooling.

## Testing Impact

Event completeness, transaction rollback, update/delete denial, redaction, integrity-check tests.

## Open Questions

Required level, retention, external anchor/sink, privileged audit-reader scope.

## Related Requirements

FR-03, FR-04, FR-05, FR-06; BR-04, BR-07, BR-09.
