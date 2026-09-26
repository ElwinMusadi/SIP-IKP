# ADR-003 — RBAC and Authorization

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

Four roles are defined, but role strings alone do not prevent ownership, cross-unit, status, or field-level violations.

## Problem

Define enforceable authorization for confidential clinical records.

## Constraints

BR-01 restricts report creation; BR-02 requires unit/role confidentiality; workflow actions belong to designated actors.

## Options Considered

### Option A — Role-only checks

Simple but vulnerable to IDOR/BOLA and illegal state actions.

### Option B — RBAC plus unit, ownership, state, and field policy

Moderate complexity with explicit domain fit.

### Option C — General-purpose policy engine

Powerful but unnecessary operational complexity.

## Decision

Recommend Option B with default deny. `RBAC-MATRIX.md` is canonical. Backend policy and scoped D1 query are the security boundary; UI guards are UX only.

## Rationale

It directly models actual authority without adding external infrastructure.

## Consequences

### Positive

Clear least privilege and testable negative cases.

### Negative

Policy functions and scoped assignments must be maintained consistently.

## Security Impact

Administrator receives no clinical access by default. PMKP access requires explicit scope.

## Data Impact

Stable unit/role assignment data and actor snapshots are required.

## Implementation Impact

All handlers call central policy; queries filter scope before returning rows.

## Testing Impact

Positive matrix and negative enumeration/cross-unit/state tests are release gates.

## Open Questions

Administrator break-glass; delegation; multi-role; print/export permissions.

## Related Requirements

FR-01 through FR-07; BR-01, BR-02, BR-04, BR-05, BR-06, BR-07, BR-09.
