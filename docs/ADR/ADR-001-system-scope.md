# ADR-001 — System Scope

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

The Product Blueprint defines an IBS application but grants PMKP access to all hospital incidents.

## Problem

A production scope is required without hard-coding IBS in a way that blocks future units or granting unsupported hospital-wide access.

## Constraints

Confidentiality is unit/role restricted under BR-02. Current workflows and master data are IBS-focused. Hospital-wide organization policy is absent.

## Options Considered

### Option A — IBS-only data model

Simple, but embeds current scope and increases later migration/rework.

### Option B — Hospital-wide from launch

Matches one PMKP statement, but expands privacy, master data, routing, testing, and governance without sufficient requirements.

### Option C — IBS-first, multi-unit-capable architecture

Stable unit/facility keys and scoped assignments; initial grants/data remain IBS until approved.

### Option D — No scoped organization model yet

Defers the decision but blocks reliable authorization and forces Phase 03 rework.

## Decision

Recommend Option C. It is not approval for hospital-wide visibility. Initial production access should remain IBS-scoped unless stakeholders approve broader PMKP scope.

## Rationale

It preserves current product focus while minimizing schema and authorization rework.

## Consequences

### Positive

Explicit isolation, future expansion path, stable master-data relationships.

### Negative

More organization/scope modeling than a hard-coded single-unit application.

## Security Impact

Every query/action requires unit/organization scope; PMKP role alone never grants hospital-wide access.

## Data Impact

Reports, assignments, and relevant master data reference stable unit IDs.

## Implementation Impact

Phase 03 models organization/unit boundaries; cross-unit grants remain disabled.

## Testing Impact

Positive IBS scope and negative cross-unit tests are mandatory.

## Open Questions

- Is PMKP MVP scope IBS-only or hospital-wide?
- Are multi-role, delegation, and temporary coverage required?

## Related Requirements

BR-02; Blueprint role matrix. No individual AC maps this decision.
