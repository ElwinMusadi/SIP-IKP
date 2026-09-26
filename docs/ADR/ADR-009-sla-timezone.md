# ADR-009 — SLA and Timezone Standard

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

FR-06 and BR-03 require a maximum 2×24-hour reporting period, but source clock, timezone, and exact boundary were undefined.

## Problem

Define deterministic, auditable time semantics independent of browser timezone.

## Constraints

Hospital location, serverless runtime, user-entered incident time, server submission time, and late reports remaining accepted.

## Options Considered

### Option A — Browser/local arithmetic

Simple but manipulable and timezone-dependent.

### Option B — Server UTC instants and absolute 48-hour duration

Deterministic and audit-friendly.

### Option C — Calendar/business-hours SLA

Not supported by the baseline phrase 2×24 hours.

## Decision

Recommend Option B. Normalize incident time to UTC; server creates `submitted_at`; `deadline_at = incident_at + 48h`; overdue only when `submitted_at > deadline_at`. Display in `Asia/Makassar`.

## Rationale

The Blueprint describes late as greater than 48 hours, making exact 48 hours on time.

## Consequences

### Positive

Consistent backend/reporting calculation.

### Negative

Requires explicit offset/zone input handling and correction policy.

## Security Impact

Client cannot set submission/audit timestamps or official SLA outcome.

## Data Impact

UTC millisecond instants, stored deadline/outcome/reason/algorithm version, date-only fields separated.

## Implementation Impact

Backend calculates SLA transactionally at formal submit; revisions do not reset it.

## Testing Impact

Before/exact/after boundary, invalid/future input, zone conversion, server clock, correction tests.

## Open Questions

Future-time tolerance; incident-time correction effect; controlled late-reason categories.

## Related Requirements

FR-02, FR-06; BR-03; collective AC overdue item.
