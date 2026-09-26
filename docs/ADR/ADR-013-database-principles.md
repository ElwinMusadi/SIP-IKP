# ADR-013 — D1 Database Principles

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

The Blueprint has a conceptual data dictionary but no executable, revision-safe relational standard.

## Problem

Define constraints and migration principles before Phase 03 creates schema.

## Constraints

SQLite/D1, workflow history, unit scope, high confidentiality, optimistic concurrency, and forward deployment.

## Options Considered

### Option A — Mirror Blueprint tables literally

Fast but preserves one-to-one revision and audit gaps.

### Option B — Relational model revised by accepted ADRs

Moderate design work, preserves evidence and scope.

### Option C — Document/event database style in SQLite

Flexible but weak relational integrity and query clarity.

## Decision

Recommend Option B following `DATA-ARCHITECTURE.md`: snake_case, application UUIDv7-compatible text IDs, UTC timestamps, FK/CHECK/UNIQUE constraints, explicit nullability, optimistic versions, versioned revisions, forward-only migrations, synthetic fixtures, no generic soft delete.

## Rationale

It uses D1 strengths and resolves identified Blueprint inconsistencies.

## Consequences

### Positive

Testable integrity, query planning, audit history, and scoped data.

### Negative

Schema differs from the literal conceptual diagram and needs traceability.

## Security Impact

Constraints supplement server validation; deactivation preserves attribution.

## Data Impact

Adds organization/assignments, addenda, revision cycles, sessions if approved, idempotency, and richer audit identity.

## Implementation Impact

Phase 03 writes immutable numbered migrations and query-plan tests.

## Testing Impact

Empty/upgrade migration, FK, checks, uniqueness, transactions, indexes, version conflict tests.

## Open Questions

Scope/session/audit/attachment/retention decisions affect optional tables and fields.

## Related Requirements

FR-01 through FR-07; BR-01 through BR-09.
