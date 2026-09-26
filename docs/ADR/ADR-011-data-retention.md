# ADR-011 — Data Retention and Lifecycle

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

The system handles confidential clinical/audit information, but no retention periods, archival, disposition, or legal-hold rules exist.

## Problem

Avoid permanent or premature storage/deletion decisions invented by implementation.

## Constraints

Reports, addenda, revisions, audit, attachments, accounts, sessions, logs, exports, backups, and unknown hospital policy.

## Options Considered

### Option A — Keep everything indefinitely

Simple but unjustified privacy/cost exposure.

### Option B — Developer-selected periods

Actionable but invents hospital policy.

### Option C — Lifecycle-ready schema with stakeholder-owned retention matrix

Supports later approved disposition without inventing periods.

## Decision

Recommend Option C. Submitted evidence is not hard-deleted by normal application flows. Users/master data deactivate when referenced. Draft/session/log/export lifecycles await approved durations. Legal hold overrides disposition and is audited.

## Rationale

Retention is governance, not a developer default.

## Consequences

### Positive

No unsupported deletion policy and clear approval gate.

### Negative

Cleanup automation and storage forecasts remain incomplete.

## Security Impact

Retention minimizes exposure only after approved; access continues to require policy throughout archive/hold.

## Data Impact

Explicit lifecycle/hold metadata where applicable; no universal `deleted_at` pattern.

## Implementation Impact

Phase 03 avoids retention jobs and invented period constraints.

## Testing Impact

Lifecycle/hold precedence, deactivation, disposition authorization, and backup deletion tests after policy approval.

## Open Questions

Periods/triggers for every data class; archive medium; disposal evidence; hold authority; backup propagation.

## Related Requirements

BR-02, BR-04, BR-07. No explicit retention FR/BR/AC exists.
