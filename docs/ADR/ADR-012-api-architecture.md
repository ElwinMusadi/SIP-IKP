# ADR-012 — API Architecture

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

The Blueprint states REST on Pages Functions but defines no endpoint, error, pagination, concurrency, or idempotency contract.

## Problem

Create a consistent same-origin API boundary aligned with workflow and RBAC.

## Constraints

React SPA, Pages Functions, D1, cookie sessions, confidential data, and low complexity.

## Options Considered

### Option A — Ad hoc route handlers

Fast initially but inconsistent and unsafe.

### Option B — Versioned REST resources plus explicit workflow commands

Clear contracts, standard errors, and domain-aligned transitions.

### Option C — GraphQL/RPC platform

Unnecessary dependency and operational complexity.

## Decision

Recommend Option B. `/api/v1`, JSON resources, explicit `/actions/{command}`, problem details errors, request IDs, cursor pagination, optimistic concurrency, and idempotency for consequential commands. `API-CONTRACT.md` is canonical.

## Rationale

It fits Pages Functions and prevents arbitrary status mutation.

## Consequences

### Positive

Predictable clients, tests, errors, and authorization.

### Negative

Requires contract discipline and idempotency/version storage.

## Security Impact

Same-origin default, cookie/CSRF controls, scoped authorization, no-store, safe errors.

## Data Impact

Resource versions, idempotency records, stable cursors/indexes.

## Implementation Impact

Create OpenAPI/equivalent before business handlers.

## Testing Impact

Contract, problem details, scope, illegal transition, stale version, retry, cache tests.

## Open Questions

Exact page limits/export model and whether asynchronous exports are needed.

## Related Requirements

FR-01 through FR-07; BR-01 through BR-09; collective AC-01 through AC-05.
