# ADR-002 — Canonical Workflow State Machine

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

The Blueprint uses inconsistent narrative and machine status vocabularies and omits a revision state.

## Problem

Implementation needs one authoritative lifecycle and transition policy.

## Constraints

FR-02–FR-06 and BR-03–BR-09 define actors, branches, locks, revisions, and closure authority. RCA lifecycle is post-MVP.

## Options Considered

### Option A — Persist every milestone

Includes `RISK_GRADED` and `RESUBMITTED`; creates transient limbo states.

### Option B — Persist work-ownership states and record milestones as events

Grade/resubmit are atomic events; durable states represent a real queue/owner.

### Option C — Free-form status updates

Flexible but insecure and unauditable.

## Decision

Recommend Option B using `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `SIMPLE_INVESTIGATION`, `SUBMITTED_TO_PMKP`, `ESCALATED_TO_PMKP`, `PMKP_REVIEW`, `REVISION_REQUIRED`, `COMPLETED`, and conditional `COMPLETED_BY_UNIT`. `WORKFLOW-STATE-MACHINE.md` is canonical.

## Rationale

It eliminates ambiguous intermediate states and supports explicit authorization.

## Consequences

### Positive

Deterministic commands, queues, validation, and audit.

### Negative

Void/reopen/RCA and minor-unit closure still need policy.

## Security Impact

Generic status mutation is forbidden; server validates actor, scope, current state, and version.

## Data Impact

Status has a CHECK constraint; grade, revisions, and review cycles remain separate data.

## Implementation Impact

Each transition is a command transaction with audit evidence.

## Testing Impact

Test every allowed transition and representative forbidden transition.

## Open Questions

`COMPLETED_BY_UNIT` criteria; void/reopen; RCA lifecycle; BIRU regrade.

## Related Requirements

FR-02, FR-03, FR-04, FR-05, FR-06; BR-03, BR-04, BR-05, BR-06, BR-08, BR-09; AC-01 through AC-05 collectively.
