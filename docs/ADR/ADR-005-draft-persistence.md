# ADR-005 — Draft Persistence

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

FR-02 requires drafts; discovery text suggests local cache, while BR-02 requires strict confidentiality and clinical workstations may be shared.

## Problem

Preserve drafts without leaving patient data in browser storage.

## Constraints

Crash/network resilience, 15-minute sessions, auditability, shared devices, multi-device use, and minimal complexity.

## Options Considered

### Option A — Browser-local draft

Fast recovery but exposes PHI through localStorage/IndexedDB/cache and has weak lifecycle control.

### Option B — Server-side draft

Central authorization, versioning, expiry, and continuity; requires network.

### Option C — Hybrid

Improves offline behavior but creates sync/conflict and key-management risks.

## Decision

Recommend Option B. In-memory form state autosaves to an authenticated server draft. Patient names, MR numbers, narratives, clinical fields, and credentials are prohibited from persistent browser storage.

## Rationale

FR-02 requires draft persistence, not local persistence. Server drafts best fit confidentiality and shared workstations.

## Consequences

### Positive

Central cleanup, access control, multi-device continuity, and conflict handling.

### Negative

Network dependency and autosave/API load.

## Security Impact

No sensitive localStorage/sessionStorage/IndexedDB/service-worker cache/URL data.

## Data Impact

Draft records require owner, unit, version, update time, and lifecycle state.

## Implementation Impact

Autosave uses optimistic concurrency and safe retry; no offline mode in MVP.

## Testing Impact

Ownership, session expiry, stale save, retry, browser/account switch, and cache absence tests.

## Open Questions

Draft expiry/recovery period and notification policy.

## Related Requirements

FR-02; BR-02. No individual AC maps draft storage technology.
