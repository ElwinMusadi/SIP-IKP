# Data Model Candidate

## 1. Purpose

This document is a reversible data-model exploration for Phase 03. It separates stable technical seams from unresolved organizational, clinical, security, and governance decisions.

## 2. Status

# PROVISIONAL / NON-PRODUCTION / SUBJECT TO ADR APPROVAL

This is not DDL, a production migration, an accepted ERD, a wire contract, or hospital policy. No ADR is `ACCEPTED`. Tables, fields, constraints, and relationships below are candidates only.

## 3. Source of truth

- Product Blueprint FR-01–FR-07 and BR-01–BR-09;
- collective, not individually mapped, AC-01–AC-05;
- `ARCHITECTURE-DECISIONS.md` and Phase 02 documents;
- ADR-001 through ADR-018;
- `Form IKP.pdf`, whose official/current status and field-level mapping remain unverified.

When this candidate conflicts with the Blueprint, the conflict is recorded rather than resolved silently.

## 4. Candidate status legend

| Label              | Meaning                                                                     |
| ------------------ | --------------------------------------------------------------------------- |
| `PROVISIONAL`      | Reversible design candidate; requires ADR approval before authoritative DDL |
| `PENDING APPROVAL` | Depends on named stakeholder decision                                       |
| `PENDING POLICY`   | Permission/lifecycle behavior is deliberately disabled                      |
| `CONDITIONAL`      | Included only if another decision enables the capability                    |
| `BLOCKED`          | Must not be implemented or migrated now                                     |
| `HARNESS ONLY`     | Disposable local test infrastructure, never production migration            |

## 5. Candidate entity register

| Entity                          | Status                      | Purpose                                                          | Depends On                | Decision                                      |
| ------------------------------- | --------------------------- | ---------------------------------------------------------------- | ------------------------- | --------------------------------------------- |
| `users`                         | PROVISIONAL                 | Stable account/profile identity and active state                 | ADR-004, ADR-018          | Auth/session/password model pending           |
| `roles` / role codes            | PROVISIONAL                 | Canonical role reference                                         | ADR-003                   | Multi-role composition pending                |
| `role_assignments`              | PROVISIONAL                 | Role plus organizational scope and validity                      | ADR-001, ADR-003          | Unit hierarchy/delegation pending             |
| `units` / organization nodes    | PROVISIONAL                 | Stable authorization/master-data scope                           | ADR-001                   | IBS versus hospital-wide pending              |
| `incident_reports`              | PROVISIONAL                 | Aggregate identity, owner, unit, current candidate state/version | ADR-002, ADR-003, ADR-006 | Workflow not accepted                         |
| `incident_submission_snapshots` | PROVISIONAL                 | Original formal Parts I/II clinical snapshot                     | ADR-006                   | Field traceability/Form approval pending      |
| `incident_addenda`              | PENDING POLICY              | Append-only candidate for later facts/corrections                | ADR-006                   | Authors, lifecycle, approval unresolved       |
| `risk_decisions`                | PROVISIONAL                 | Initial grade and regrade history without automatic calculation  | ADR-002                   | Branch-changing regrade blocked               |
| `investigation_revisions`       | PROVISIONAL                 | Investigation working/submitted version history                  | ADR-006                   | High-risk revision path pending               |
| `investigation_recommendations` | PROVISIONAL                 | Version-owned recommendations                                    | ADR-006                   | Required fields/form mapping pending          |
| `investigation_actions`         | PROVISIONAL                 | Version-owned corrective-action plans                            | ADR-006                   | Execution/effectiveness fields pending        |
| `revision_requests`             | PROVISIONAL                 | PMKP directives tied to a submitted investigation version        | ADR-002, ADR-006          | Eligible branches pending                     |
| `pmkp_review_cycles`            | PROVISIONAL                 | Repeated PMKP evaluations without overwrite                      | ADR-002, ADR-006          | RCA/regrade consequences blocked              |
| `audit_records`                 | PENDING APPROVAL            | Append-only candidate business/security evidence                 | ADR-007, ADR-008          | Integrity level/retention/attribution pending |
| `correction_requests`           | PENDING GOVERNANCE APPROVAL | Proposed emergency-MR request/approve/apply evidence             | ADR-006                   | No role or behavior granted                   |
| `attachments`                   | CONDITIONAL                 | Private R2 metadata/lifecycle reference                          | ADR-010, ADR-014          | Attachment MVP inclusion pending              |
| master/reference entities       | PROVISIONAL                 | Stable room, specialization, payer, department codes/labels      | ADR-001, ADR-013          | Effective history/source values pending       |
| `sessions` / recovery records   | BLOCKED                     | Extension point for future identity implementation               | ADR-004, ADR-018          | No auth implementation in Phase 03            |
| `idempotency_records`           | PROVISIONAL                 | Retry safety for future consequential commands                   | ADR-012                   | TTL/command list pending                      |

## 6. Candidate fields and relationships

### 6.1 Identity and scope

#### `users`

- Candidate key: UUIDv7-compatible text ID.
- Candidate fields: username/NIP/email normalized identifiers, display identity, active state, version, created/updated server timestamps.
- Lifecycle: mutable profile; deactivate rather than hard-delete when referenced.
- Audit: create, update, disable, identifier changes.
- Unresolved: password/session columns, MFA, identity retention, uniqueness normalization.

#### `role_assignments`

- Candidate key: text ID.
- Foreign keys: user, role code, organization/unit scope, assigned-by actor.
- Candidate fields: validity interval, active/deactivated state, version.
- Cardinality: user 1:N assignments.
- Unresolved: union versus selected role, delegation, self-approval, temporary coverage.

### 6.2 Incident aggregate

#### `incident_reports`

- Candidate key: UUIDv7-compatible text ID.
- Foreign keys: creator, owning unit, current submission snapshot, optional current investigation/review references.
- Candidate fields: report number reference, candidate status, optimistic `row_version`, created/submitted server timestamps.
- Mutable: draft aggregate/workflow metadata only through future approved commands.
- Immutable: identity and formal submission relationship after submission.
- Audit: every consequential candidate state/version change.
- Unresolved: final state enum, report number allocation, void/reopen/unit completion.

#### `incident_submission_snapshots`

- Candidate key: text ID; one formal snapshot per successful formal submission unless requirements later approve a different model.
- Foreign key: incident report.
- Candidate fields: submitted Parts I/II values, source master code/label snapshots, incident/admission instants, submission time, SLA calculation snapshot/policy version.
- Lifecycle: immutable candidate after creation.
- Critical separation: PMKP revision never rewrites this record.
- Unresolved: official Form fields, patient-versus-staff conditionality, emergency-MR governance, SLA correction impact.

### 6.3 Investigation history

#### `investigation_revisions`

- Candidate key: text ID.
- Foreign key: incident report; optional preceding revision.
- Candidate fields: revision number, lifecycle (`DRAFT_CANDIDATE`/`SUBMITTED_CANDIDATE` only as harness concepts), causes, date-only start/end, version, submitter/attribution references, timestamps.
- Mutable: current working revision before submit.
- Immutable: submitted revision and its children.
- Cardinality: incident 1:N revisions.

#### Recommendations and actions

- Must reference `investigation_revision_id`, not only a mutable investigation shell.
- Ordered child rows freeze with submitted revision.
- Action realization, evidence, verification, and effectiveness fields remain unresolved and must not be invented as approved requirements.

#### Alternative evaluation

| Alternative               | Advantages                         | Disadvantages                       | Status                                          |
| ------------------------- | ---------------------------------- | ----------------------------------- | ----------------------------------------------- |
| Overwrite                 | Simple reads/writes                | Loses evidence and revision history | Not recommended; not selected                   |
| Versioned records         | Reconstructable and understandable | More rows/current-version handling  | PROVISIONAL ADR-006 recommendation              |
| Generic append-only diffs | Strong granular history            | Complex reconstruction/validation   | Not recommended for current scale; not selected |

No option becomes final until ADR-006 is accepted.

### 6.4 PMKP review

#### `pmkp_review_cycles`

- Candidate key: text ID.
- Foreign keys: incident, reviewed investigation revision when applicable, reviewer.
- Candidate fields: cycle number, completeness decision, further-RCA decision, proposed/effective regrade references, directives, status/version, server timestamps.
- Lifecycle: working review may change; submitted decision cycle freezes.
- Cardinality: incident 1:N cycles.
- BLOCKED behavior: further RCA `YA` has no approved next state; branch-changing regrade cannot be finalized.

### 6.5 Addendum candidate

#### `incident_addenda`

- Status: `PENDING POLICY`.
- Candidate fields: ID, incident ID, author reference/snapshot, content, reason, created server time, report version reference, optional superseding reference, audit-record reference.
- Candidate characteristic: append-only; does not mutate clinical snapshot.
- No final role permission exists.

Unresolved questions:

- Who may author an addendum?
- Is it allowed only after submission, or also after completion?
- Does it require approval or PMKP notification?
- Can it influence risk assessment or reopen review?
- How is an incorrect addendum corrected?
- Which attribution and audit evidence is required?

### 6.6 Risk decisions

- Candidate entity records grade, actor, server timestamp, reason, source review, and superseded/effective history.
- No formula or automatic clinical classification is allowed.
- BIRU/HIJAU/KUNING/MERAH definitions are not extended beyond Blueprint.
- Branch-changing regrade is `BLOCKED / PENDING POLICY`.

### 6.7 Emergency MR correction candidate

A `correction_requests` concept may preserve field, before value, proposed after value, requester, approver, reason, evidence reference, requested/decided/applied times, and audit references.

Status: `PENDING GOVERNANCE APPROVAL`. No requester, approver, separation-of-duty, API, permission, or application behavior is selected.

### 6.8 Audit record candidate

Use only the terms **APPEND-ONLY CANDIDATE** or **AUDIT RECORD**.

Candidate fields:

- event ID;
- request ID;
- actor ID and proposed historical identity/scope snapshot;
- event/action type;
- resource type and ID/version;
- previous/new state references;
- server timestamp;
- approved structured metadata;
- optional before/after reference, not raw sensitive payload duplication.

Sensitive patient name, MR number, chronology, passwords, tokens, cookies, and attachment content/object keys are not duplicated into logs by default. Hash chain/external sink fields are not production requirements until ADR-007 approval.

### 6.9 Attachment extension point

Status: `CONDITIONAL`.

Candidate D1 metadata: attachment ID, incident ID, opaque R2 object key, original filename, declared/detected MIME, byte size, SHA-256 candidate, uploader, created time, lifecycle state, intent expiry, scanning result, version.

R2 remains private. No upload, public bucket, signed URL, production object, or patient file is created. Inclusion, allowed types/limits, scanning, retention, deletion, hold, and reconciliation policy remain unresolved.

### 6.10 Master/reference data

Candidate entities: units/departments, operating rooms/locations, specializations, payer types, and other Form-approved values.

Use stable codes. Historical reports require submission-time code/label snapshots or effective-dated immutable versions. Exact values and hierarchy require official source validation.

## 7. Candidate relationship view

```text
users ──< role_assignments >── units
  │
  └──< incident_reports ──1 incident_submission_snapshots
           ├──< risk_decisions
           ├──< investigation_revisions
           │       ├──< investigation_recommendations
           │       └──< investigation_actions
           ├──< revision_requests
           ├──< pmkp_review_cycles
           ├──< incident_addenda          [PENDING POLICY]
           ├──< correction_requests       [PENDING GOVERNANCE]
           ├──< audit_records             [PENDING INTEGRITY APPROVAL]
           └──< attachments               [CONDITIONAL]
```

## 8. Mutable versus immutable candidate matrix

| Data                           | Draft/working                                    | Submitted                            | Completed                             |
| ------------------------------ | ------------------------------------------------ | ------------------------------------ | ------------------------------------- |
| Incident draft                 | Owner-editable candidate with optimistic version | Not applicable                       | Not applicable                        |
| Clinical submission snapshot   | Created atomically at submit                     | Immutable candidate                  | Immutable candidate                   |
| Workflow metadata              | Command-controlled candidate                     | Command-controlled candidate         | Frozen unless future approved process |
| Investigation working revision | Editable by future approved policy               | Freezes with children                | Frozen                                |
| Prior investigation versions   | Immutable                                        | Immutable                            | Immutable                             |
| PMKP working review            | Editable by future approved policy               | Freezes on decision                  | Frozen                                |
| Addendum                       | Not applicable                                   | PENDING POLICY append-only candidate | PENDING POLICY                        |
| Audit record                   | Append-only candidate                            | Append-only candidate                | Append-only candidate                 |
| Master data                    | Version/deactivation controlled                  | Historical label/code preserved      | Historical label/code preserved       |

## 9. Time and SLA candidate

- UTC RFC 3339 millisecond instants for server events.
- `Asia/Makassar` display candidate.
- Date-only fields remain `YYYY-MM-DD`.
- Candidate formula: `submitted_at > incident_at + 48 hours` means overdue.
- Client time is never authoritative.
- Future-time tolerance and corrected-incident-time KPI effect remain pending.

## 10. Candidate constraints and indexes

Reversible exploration may test:

- explicit FK enforcement;
- NOT NULL where absence is never valid;
- CHECK constraints for Boolean and currently proposed enum values;
- UNIQUE normalized identifiers and parent/version pairs;
- optimistic positive integer versions;
- child revision FKs;
- scoped queue/index candidates and stable ID tie-breakers.

Do not finalize workflow CHECK values, retention constraints, session uniqueness, attachment lifecycle, or organization hierarchy before their ADRs are accepted.

## 11. Retention considerations

All retention periods, archival, deletion, disposition, hold authority, and backup propagation are `PENDING GOVERNANCE`. Phase 03 creates no TTL, automatic deletion, archival job, or hold/release operation. Synthetic timestamps exist only for deterministic tests.

## 12. Migration strategy

Production migrations are prohibited in Phase 03. The only SQL is under `test-support/d1/candidate/`, is labeled `NON-PRODUCTION / DISPOSABLE / SUBJECT TO ADR APPROVAL`, uses harness-only tables, and must never be executed with `--remote`.

After ADR acceptance, production migrations would be reviewed, numbered, forward-only, tested on empty/prior databases, and never edited after shared deployment.

## 13. Reversibility strategy

- Candidate docs contain no authoritative DDL.
- Disposable D1 state uses isolated `.wrangler/phase-03-d1` and can be deleted entirely.
- Harness table names use `synthetic_harness_*`, not future production names.
- Fixtures have TEST/SYNTHETIC constraints.
- Conditional models remain documentation-only.
- No production IDs/bindings/secrets are added.
- No business endpoint consumes the candidate model.

## 14. Unresolved decisions

See `DATA-MODEL-DECISION-MATRIX.md`. Critical gates include official form traceability, organizational scope, multi-role/delegation, workflow/RCA/regrade/unit completion, addendum/emergency-MR governance, session/password architecture, audit/e-paraf assurance, attachment inclusion, retention, report numbering, patient/staff conditional fields, and corrective-action completion semantics.
