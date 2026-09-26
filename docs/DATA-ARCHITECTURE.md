# Data Architecture

## 1. Scope

This document defines principles and conceptual entities for Phase 03. It does not create D1 schema, migration, seed, or production data.

## 2. System scope and organizational model

**Recommendation:** implement an IBS-first deployment with multi-unit-capable data structures. Current screens/workflow remain scoped to IBS, but every scoped record references stable organization/unit IDs rather than embedding `IBS` or free-text names into authorization logic.

This minimizes future rework while preserving current product focus. Hospital-wide PMKP access remains **STAKEHOLDER DECISION REQUIRED**. Architecture readiness for multiple units does not grant cross-unit access.

Conceptual organization entities:

- organizations/facilities;
- departments/units;
- operating rooms/locations;
- user role assignments with unit scope and validity;
- master specialization and payer types.

## 3. Naming and identifier conventions

- SQL tables and columns: plural/singular convention must be consistent; recommendation is plural `snake_case` tables and `snake_case` columns.
- API/domain names: `camelCase`; mapping is explicit at repository boundary.
- Primary keys: application-generated UUIDv7-compatible text IDs to preserve global uniqueness and time locality without relying on D1 auto-increment IDs.
- Human report number is a separate unique display identifier, not a primary key.
- Foreign-key columns end in `_id`.
- Booleans use integer storage with `CHECK (value IN (0,1))` where SQLite requires it.
- Enum-like domain values use canonical uppercase text with `CHECK` constraints and application union/schema validation.

## 4. Timestamp and date standard

- Instant storage/API: UTC RFC 3339/ISO 8601 with milliseconds and `Z`.
- Server/Pages Functions clock is authoritative for audit, submission, receipt, approval, and mutation times.
- User browser clock is display/input aid only and never computes official SLA.
- Display zone: `Asia/Makassar` for the hospital, explicit in formatting.
- Date-only values use `YYYY-MM-DD` and must not be converted through UTC instants.
- Investigation start/end and target dates remain date-only unless stakeholders require time-of-day.
- Incident/admission values are local clinical date-times submitted with an explicit zone/offset and normalized to UTC; preserve source zone/offset if required for evidence.
- Store timestamps at millisecond precision; do not fabricate greater precision.
- Indonesia has no daylight-saving transition, but the named IANA zone—not a hard-coded `+08:00`—is canonical for display and future rules.

## 5. Canonical SLA formula

Let:

- `incident_at` = validated incident instant normalized to UTC;
- `submitted_at` = server timestamp from the successful formal submission transaction;
- `deadline_at = incident_at + 48 hours` as an absolute duration.

Then:

```text
is_overdue = submitted_at > deadline_at
```

At exactly `deadline_at`, the report is on time. A report one millisecond after is overdue. Draft creation/autosave does not stop the clock. Revision/resubmission does not recalculate original reporting compliance.

Rules:

- future `incident_at` beyond an approved clock-skew tolerance is rejected at submit;
- missing/invalid incident time blocks formal submit;
- missing server submission time is a failed transaction, not an “unknown SLA” submitted report;
- overdue reports are accepted only with non-empty overdue reason;
- preserve `incident_at`, `submitted_at`, `deadline_at`, derived outcome, reason, algorithm version, and calculation event for auditability;
- display all values in `Asia/Makassar` with zone labeling.

The clock-skew tolerance and whether incident-time corrections through a governed addendum affect the official metric are stakeholder decisions.

## 6. Conceptual entities required

### Identity and organization

- `users` — account/profile status; deactivate rather than hard-delete when referenced.
- `role_assignments` — role, unit scope, validity, assigner; supports multi-role if approved.
- `sessions` — opaque-session digest and lifecycle metadata if ADR-004 is approved.
- password reset/recovery token records.
- `units`, `locations`, `specializations`, `payer_types` and other stable-code master data.

### Incident domain

- `incident_reports` — aggregate identity, unit, lifecycle status, optimistic version, and reference to the immutable formal submission snapshot.
- `incident_submission_snapshots` — immutable Parts I/II clinical facts captured at formal submit; PMKP investigation revision never creates or rewrites this snapshot.
- `report_number_sequences` or equivalent — atomic monthly display-number allocation.
- `incident_addenda` — append-only post-submit corrections/supplements.
- `incident_status_events` or consolidated domain audit references.

### Investigation and PMKP

- `investigation_revisions` — editable draft versions that become immutable when submitted.
- recommendation and corrective-action children must reference `investigation_revision_id`; they freeze with the submitted revision and never point only to a mutable investigation shell.
- `revision_requests` — PMKP directives, requested-field scope, actor/time.
- `pmkp_review_events`/versions — repeated evaluation cycles; do not overwrite one unique row.
- risk-grade history or audit-backed grade decisions.

### Evidence and output

- `audit_events` — append-only domain/security attribution. Use a field allowlist: identity/session/status/version/reason metadata may be snapshotted where approved; patient names, MR numbers, chronology, and free-text clinical payloads are recorded only as redacted change indicators or references, not duplicated by default.
- `incident_attachments` — metadata/state for private R2 objects if attachment scope is approved.
- idempotency records for consequential commands.
- generated export records if asynchronous outputs are later approved.

## 7. Immutability and mutation policy

### Draft

Owning reporter may update allowed fields while status is `DRAFT`. Use optimistic `version` to prevent lost updates.

### Submitted clinical event

At formal submission, the clinical-event snapshot becomes immutable under BR-04. It includes patient/incident facts, chronology, classification, impact, and immediate response submitted at that moment. Later information is a new `incident_addenda` record.

### Workflow metadata

Status, assignment, grade, receipt, and review metadata change only through authorized commands. Prior decisions remain in audit/history.

### Completed

Completion freezes workflow decision records and submitted versions. No hard delete or silent edit. Addenda after completion require stakeholder policy and may require PMKP notification/reopen.

### Append-only addendum concept

Minimum conceptual fields:

- `id`;
- `incident_report_id`;
- `author_user_id`;
- actor identity snapshot/reference;
- `content`;
- `reason`;
- `created_at` server time;
- `report_version_at_creation`;
- audit-event reference.

Addenda cannot update/delete earlier addenda through normal application flows. A correction to an addendum is another linked superseding addendum/event, not an overwrite.

Emergency MR correction uses a dedicated authorized correction/addendum command and preserves old/new values; exact actor/approval policy is unresolved.

## 8. Revision model

Options:

- overwrite: simplest, unacceptable loss of evidence;
- versioned record: preserves each submitted investigation and supports current version;
- generic append-only diffs: strong history but harder reconstruction and validation.

**Recommendation:** versioned investigation and PMKP review records plus append-only audit events. An editable working revision may be updated until submitted; on submit it is frozen. PMKP revision request records directives and field scope. Kepala Ruangan creates the next revision from the prior version, edits permitted investigation fields, then resubmits. PMKP sees a chronological list and comparison metadata. Original incident chronology remains outside revision scope.

## 9. Foreign keys and deletion

- Enable and test foreign-key enforcement.
- Use `RESTRICT` for submitted reports, audit events, attribution, revisions, and referenced users/master values.
- Use tightly reviewed `CASCADE` only for purely dependent, unsubmitted ephemeral rows when evidence is not required.
- User/master records are deactivated, not hard-deleted, once referenced.
- Preserve submission-time master code and display-label snapshots, or reference an effective-dated immutable master version, wherever historical PDF/report meaning must survive a rename. A current master join alone is insufficient.
- No generic soft-delete column on every table. Use explicit lifecycle status/deactivated time only where domain semantics require it.

## 10. Constraints and nullability

- Prefer `NOT NULL`; nullable means a documented legitimate absence, not “not validated.”
- Separate draft-time optionality from submit-time completeness: DB may permit a draft field to be null, while the submit command validates the complete snapshot.
- Add `CHECK` constraints for states, grades, classifications, dates, booleans, positive file size, and branch invariants practical in SQLite.
- Unique constraints: normalized username/email/NIP policy, report number, R2 object key, idempotency tuple, version per parent.
- Cross-record workflow invariants remain in transactions/domain services and tests where SQL checks cannot express them.

## 11. Indexing principles

Create indexes from approved query patterns, not speculation. Phase 03 should cover at least:

- queue/list by unit + status + created/submitted time;
- reporter ownership + created time;
- PMKP queue status + submission/escalation time;
- risk grade + time for scoped reporting;
- incident time and SLA outcome;
- audit events by incident + created time + ID;
- child/revision foreign keys;
- active role assignments by user/unit/role;
- session digest and expiry;
- attachment parent/state.

Use stable tie-breaker IDs for pagination and inspect D1 query plans with realistic synthetic non-clinical data.

## 12. Transaction boundaries

D1 transaction/batch boundaries should cover:

- formal report submission + number allocation + status + SLA snapshot + audit;
- receipt/grade/escalation + audit;
- investigation version submission/resubmission + status + attribution + audit;
- revision request/regrade/completion + audit;
- account role/unit change + session invalidation metadata + audit where feasible.

Optimistic version checking belongs in the same transaction. No partial status change without its required evidence/audit.

## 13. Migration and seed policy

- Versioned, forward-only migrations are source-controlled and immutable after shared deployment.
- Naming recommendation: `NNNN_description.sql`, monotonically increasing, for example `0001_identity_and_organization.sql` only when Phase 03 begins.
- Every migration is tested against empty and previous-schema databases.
- Destructive changes use expand/migrate/contract or explicit maintenance plan; backup/restore implications reviewed.
- Production seed contains approved idempotent master codes only—never patient data, incidents, shared passwords, static admin credentials, or real employee data.
- Test fixtures are synthetic and isolated from production seed.

## 14. D1/R2 consistency boundary

D1 and R2 do not share an atomic transaction. Use a state machine/saga-like two-phase upload without introducing a distributed event bus:

1. Authorize parent incident/action.
2. Create D1 attachment intent with state `PENDING_UPLOAD`, opaque key, expected type/size/checksum, expiry, and idempotency key.
3. Upload to private R2/quarantine key.
4. Verify existence, size, MIME/magic bytes, checksum, and scanning policy.
5. In D1, finalize metadata as `AVAILABLE` and audit the upload.
6. Only `AVAILABLE` objects may be downloaded.

Failure handling:

| Failure                                   | Expected behavior                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| D1 intent succeeds, R2 upload fails       | Mark/leave expired `PENDING_UPLOAD`; retry with idempotency or cleanup intent after TTL                                         |
| R2 upload succeeds, D1 finalize fails     | Object remains quarantine/orphan; reconciliation verifies intent and retries finalization or deletes after retention window     |
| Metadata says `AVAILABLE`, object missing | Deny download, emit integrity alert, mark `MISSING` through governed reconciliation; never return silent 404 only               |
| Object exists, metadata absent            | Treat as orphan/quarantined; never authorize by key alone; delete after approved grace/legal-hold checks                        |
| Metadata deletion requested               | Use lifecycle state such as `PENDING_DELETE`; delete object, verify, then tombstone metadata/audit; handle retries idempotently |

Schedule reconciliation with an approved mechanism and alert on age/count thresholds. Exact cadence and malware-scanning service are unresolved.

## 15. Attachment architecture decision

**Recommendation:** defer attachment upload from initial MVP because Blueprint does not include it clearly in FR-01 through FR-07 or MVP scope, despite a conceptual entity/R2 statement. If stakeholders include it, decide:

- allowlist—recommend PDF/JPEG/PNG only initially, but clinical owner must approve;
- maximum per file/count/total—stakeholder and platform decision;
- claimed MIME plus magic-byte verification;
- SHA-256 checksum;
- private R2 and opaque keys without patient/report number;
- malware scanning/quarantine feasibility;
- authorization inherited from parent plus explicit attachment action;
- short-lived download, no-store, safe disposition, audit;
- retention, deletion, legal hold;
- reconciliation described above.

## 16. Retention and lifecycle proposal

No periods are approved. Phase 03 may model lifecycle fields but must not encode invented durations.

| Data class                                         | Default architectural treatment               | Stakeholder decision required                      |
| -------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| Submitted report/addenda/investigation/PMKP review | No hard delete; archive/lifecycle-ready       | Retention, archive, disposition, legal hold        |
| Audit events                                       | Append-only; coupled to evidence lifecycle    | Retention and integrity level                      |
| User accounts                                      | Deactivate; preserve referenced identity      | Account/profile retention and anonymization policy |
| Drafts                                             | Server-side; eligible for governed expiry     | Expiry, notification, recovery, deletion           |
| Sessions/reset tokens                              | Expiring ephemeral records                    | Exact absolute lifetime and cleanup                |
| Attachments                                        | Private lifecycle states                      | Retention, deletion, hold, orphan grace            |
| Operational/security logs                          | Redacted and separated                        | Retention/access                                   |
| Exports                                            | Avoid persistent server copies where possible | Expiry, deletion, watermark and hold               |

Recommended lifecycle capability: after legal/records stakeholders approve an authority and procedure, an active hold would override normal disposition and be auditable. No hold/release/disposition operation is authorized by this document.

## 17. Stakeholder decisions blocking portions of Phase 03

1. IBS-only vs hospital-wide PMKP scope and organization hierarchy.
2. Multi-role/scoped assignment and delegation.
3. KNC-minor completion eligibility.
4. Void/reopen and post-completion addendum behavior.
5. Emergency MR correction authority.
6. Session option if session tables are included in Phase 03.
7. Audit integrity level and attribution fields.
8. Retention periods and legal hold.
9. Attachment inclusion and policies.
10. Report-number sequence behavior.

## 18. Related requirements

- FR-01 through FR-07
- BR-01 through BR-09
- AC-01 through AC-05 collectively
