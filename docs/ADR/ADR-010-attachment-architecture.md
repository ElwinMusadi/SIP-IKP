# ADR-010 — Attachment Architecture

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

R2 and `incident_attachments` appear in technical/data concepts, but attachments are absent from FR-01–FR-07 and stated MVP scope.

## Problem

Determine whether confidential evidence files belong in MVP and define safe handling if they do.

## Constraints

Private medical data, malware, authorization, R2/D1 non-atomicity, retention, and no approved file policy.

## Options Considered

### Option A — Include attachments in MVP

Adds evidence capability but substantial security/operations work.

### Option B — Defer attachments

Keeps MVP aligned to explicit FRs and reduces risk.

### Option C — Metadata/reference only

Could reference external controlled records, but no integration requirement exists.

## Decision

Recommend Option B until stakeholders explicitly include attachments. If included, require private R2, type/size/count policy, MIME and magic-byte checks, checksum, quarantine/scanning decision, opaque keys, authorized short-lived download, audit, retention, and reconciliation.

## Rationale

Technical model presence is insufficient to silently expand MVP.

## Consequences

### Positive

Avoids premature high-risk upload surface.

### Negative

Users cannot attach evidence until a later approved phase.

## Security Impact

No public bucket or direct unauthenticated object URL is permitted.

## Data Impact

Attachment tables/lifecycle states are omitted or isolated until approved.

## Implementation Impact

If approved, follow ADR-014 two-phase lifecycle; never implement simple DB+upload happy path only.

## Testing Impact

Authorization, type spoofing, malware/quarantine, size, checksum, missing/orphan, expiry, and audit tests.

## Open Questions

MVP inclusion, allowed types, limits, scanner, retention, deletion/legal hold, URL lifetime.

## Related Requirements

No explicit FR/BR includes attachments. Conceptual data/technical sections reference R2 and `incident_attachments`.
