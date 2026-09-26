# ADR-006 — Incident Immutability, Addendum, and Revision

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

BR-04 locks submitted chronology, requires addenda, and FR-05 permits repeated PMKP revision cycles; the conceptual one-to-one model risks overwriting history.

## Problem

Preserve original clinical facts and every investigation/review version.

## Constraints

Draft mutability, submitted evidence, emergency MR correction, PMKP directives, and completion.

## Options Considered

### Option A — Overwrite current rows

Simple but destroys evidence.

### Option B — Versioned investigation/review records plus append-only addenda

Clear reconstruction with moderate schema complexity.

### Option C — Generic append-only event sourcing

Strong history but excessive complexity for the project.

## Decision

Recommend Option B. Create one immutable clinical-event submission snapshot at formal submit; later facts are addenda. Freeze each submitted investigation and PMKP review cycle; revision creates a new **investigation** version and never a mutable replacement of the submission snapshot.

## Rationale

It satisfies BR-04 and revision auditability without adopting event sourcing.

## Consequences

### Positive

Complete historical evidence and comparison.

### Negative

More records and explicit “current version” handling.

## Security Impact

No role can silently rewrite submitted clinical facts or prior versions.

## Data Impact

Conceptual `incident_addenda`, `investigation_revisions`, `revision_requests`, and repeatable PMKP reviews.

## Implementation Impact

Dedicated correction/addendum/version commands; no generic submitted-report patch.

## Testing Impact

Original snapshot immutability, version history, resubmission, emergency-MR correction, and completion tests.

## Open Questions

Addendum authors; post-completion behavior; emergency MR approver; high-risk revision path.

## Related Requirements

FR-02, FR-04, FR-05, FR-06; BR-04, BR-07, BR-08; collective AC post-submit lock.
