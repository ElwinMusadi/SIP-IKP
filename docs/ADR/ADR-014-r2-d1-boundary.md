# ADR-014 — R2 and D1 Consistency Boundary

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

R2 object operations and D1 metadata transactions cannot commit atomically.

## Problem

Prevent authorized metadata from referencing missing files and private objects from becoming untracked or downloadable.

## Constraints

Pages Functions, retries, failures, private R2, low operations, unknown scanning service.

## Options Considered

### Option A — Upload then insert metadata

Leaves orphan objects on DB failure.

### Option B — Insert metadata then upload

Leaves unusable metadata on upload failure.

### Option C — Two-phase intent/quarantine/finalize plus reconciliation

Explicit eventual consistency and recovery.

## Decision

Recommend Option C if attachments are approved. Create D1 intent, upload to opaque quarantine key, validate/scan/checksum, finalize `AVAILABLE`, and reconcile expired/missing/orphan states.

## Rationale

Cross-service atomicity is impossible; explicit state and idempotent repair are safer than pretending otherwise.

## Consequences

### Positive

Recoverable partial failures and authorization based on metadata state.

### Negative

More lifecycle states, jobs, alerts, and test cases.

## Security Impact

Only `AVAILABLE` authorized objects download; R2 key alone never grants access.

## Data Impact

Attachment intent/status/checksum/expiry/reconciliation metadata.

## Implementation Impact

Requires scheduled/manual reconciliation and idempotent finalize/delete.

## Testing Impact

Every partial-failure combination, duplicate retry, missing/orphan, quarantine, and cleanup tests.

## Open Questions

Reconciliation cadence, scanner, grace period, legal hold, and alert threshold.

## Related Requirements

No explicit FR/BR attachment requirement; conceptual R2 and attachment sections only.
