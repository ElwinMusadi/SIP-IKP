# ADR-017 — Test Architecture

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

Phase 01 has one smoke test; clinical workflow, security, schema, and outputs require layered evidence.

## Problem

Define test responsibilities and requirement traceability before implementation.

## Constraints

Vitest foundation, future Pages/D1 integration, no real patient data, collective rather than individually mapped AC-01–AC-05.

## Options Considered

### Option A — Primarily E2E

High confidence per path but slow, brittle, and weak domain isolation.

### Option B — Layered tests with focused E2E

Unit/domain, D1/API/authz integration, component, E2E, accessibility, security, PDF visual, performance, restore.

### Option C — Manual acceptance only

Insufficient regression and security evidence.

## Decision

Recommend Option B. Map tests to actual FR/BR identifiers and treat the AC block collectively until stakeholders formally map individual AC IDs.

## Rationale

Balances speed, coverage, and evidence.

## Consequences

### Positive

Fast rule feedback plus end-to-end assurance.

### Negative

Fixture/tooling and environment maintenance.

## Security Impact

Negative authorization, CSRF/session, cache, upload/export, redaction, and audit integrity are mandatory.

## Data Impact

Synthetic fixtures only; deterministic local D1 reset and migration tests.

## Implementation Impact

Phase 03 adds migration/constraint/query tests before repositories; E2E framework waits for critical flows.

## Testing Impact

This ADR defines the test architecture itself.

## Open Questions

E2E browser tool, PDF golden-reference/tolerance, performance workload/percentiles, stakeholder acceptance owner.

## Related Requirements

FR-01–FR-07; BR-01–BR-09; AC-01–AC-05 collectively.
