# ADR-016 — Observability and Operations

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

The Blueprint supplies performance/uptime numbers but no measurable SLI, alerting, log, backup, restore, RPO, or RTO design.

## Problem

Define evidence and operational ownership without logging patient data or inventing targets.

## Constraints

Cloudflare Pages/D1/R2, serverless logs, confidential payloads, current shallow health endpoint.

## Options Considered

### Option A — Platform logs only

Low setup but inadequate correlation, redaction evidence, alerting, and domain audit separation.

### Option B — Structured safe logs, metrics, alerts, and runbooks using minimal Cloudflare-compatible facilities

Proportionate and extensible.

### Option C — Full external observability stack immediately

Potentially strong but unnecessary before workload/operations ownership is defined.

## Decision

Recommend Option B. Separate application, security, and domain audit data. Use request IDs, route/status/latency/error codes, redaction, liveness/readiness distinction, and owner-linked alerts. RPO/RTO and retention require stakeholder approval.

## Rationale

Supports operations without duplicating PHI or creating premature infrastructure.

## Consequences

### Positive

Diagnosable incidents and measurable NFRs.

### Negative

Sink/retention/alerts/runbooks still require operational ownership.

## Security Impact

Allowlist log fields; exclude bodies, patient identity/narrative, credentials, cookies, tokens, object content.

## Data Impact

Correlation IDs and aggregate metrics; operational logs separate from D1 domain audit.

## Implementation Impact

Add readiness only when dependencies exist; define restore drills before production.

## Testing Impact

Log redaction, correlation, alert simulation, backup/restore and dependency-health tests.

## Open Questions

SLI percentiles/windows, error budget, sink, on-call owner, RPO, RTO, retention, restore frequency.

## Related Requirements

FR-06; performance/reliability NFR. No explicit RPO/RTO requirement exists.
