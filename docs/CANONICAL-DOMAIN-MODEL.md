# Canonical Domain Model

## 1. Document Scope and Status

# STATUS: PROVISIONAL DOMAIN ARCHITECTURE — PENDING STAKEHOLDER APPROVAL

This document defines the canonical domain aggregates, entity boundaries, lifecycle contracts, and relationship rules for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

This is a **domain governance contract**, not a production D1 schema or implementation code. In accordance with Phase 05 constraints, candidate entities and boundaries remain provisional pending stakeholder ratification of governing ADRs.

---

## 2. Core Domain Principles

1. **Explicit Aggregate Boundaries:** The incident lifecycle must never be merged into a single monolithic database row. Separate aggregates represent distinct temporal, legal, and operational responsibilities.
2. **Immutable Submission Evidence:** The original clinical incident report submitted by the healthcare worker is preserved as an immutable snapshot. Subsequent clinical information is appended via addenda, never through direct mutation of the original record (`BR-04`).
3. **Traceable Revisions:** Investigation findings and PMKP evaluations support repeated revision cycles without overwriting historical versions (`ADR-006`).
4. **Separation of Risk Decision from State:** Risk grades (`BIRU`, `HIJAU`, `KUNING`, `MERAH`) are explicit decision records with audit attribution, not transient status values.
5. **Separation of Identity from Authorization:** Authentication ("who the actor is") is decoupled from authorization ("what the actor may do within an assigned unit scope").

---

## 3. Canonical Domain Aggregates

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             ORGANIZATION & IDENTITY                              │
│                                                                                  │
│   ┌───────────────┐        ┌──────────────────┐        ┌───────────────────┐     │
│   │     User      ├───────<│  Role Assignment │>───────┤ OrganizationalUnit│     │
│   └───────┬───────┘        └──────────────────┘        └─────────┬─────────┘     │
└───────────┼──────────────────────────────────────────────────────┼───────────────┘
            │ creates / receives / reviews                         │ owns scope
            ▼                                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            INCIDENT ROOT AGGREGATE                               │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                             IncidentReport                               │   │
│   │  - id: UUIDv7                                                            │   │
│   │  - report_number: "IKP/IBS/YYYYMM/XXXX"                                  │   │
│   │  - owning_unit_id: FK -> OrganizationalUnit                              │   │
│   │  - lifecycle_status: DRAFT | SUBMITTED | UNDER_REVIEW | ...              │   │
│   │  - created_by_user_id: FK -> User                                        │   │
│   │  - row_version: integer                                                  │   │
│   └────────────────────────────────────┬─────────────────────────────────────┘   │
│                                        │                                         │
│   ┌────────────────────────────────────┼─────────────────────────────────────┐   │
│   │ 1:1 Formal Snapshot                │ 1:N Revisions                       │   │
│   │ (Immutable post-submit)            │                                     │   │
│   ▼                                    ▼                                     │   │
│ ┌───────────────────────────┐        ┌───────────────────────────────────┐   │   │
│ │ IncidentSubmissionSnapshot│        │       InvestigationRevision       │   │   │
│ │ - patient demographics    │        │ - revision_number (1..N)          │   │   │
│ │ - incident facts (5W+1H)  │        │ - direct_cause / root_cause       │   │   │
│ │ - chronology narrative    │        │ - start_date / end_date           │   │   │
│ │ - reporter attribution    │        │ - approved_by_user_id (Kepala Ru) │   │   │
│ │ - SLA deadline snapshot   │        └─────────────────┬─────────────────┘   │   │
│ └───────────────────────────┘                          │                     │   │
│                                                        │ 1:N Children        │   │
│                                                        ▼                     │   │
│                                      ┌───────────────────────────────────┐   │   │
│                                      │    InvestigationRecommendation    │   │   │
│                                      │    InvestigationActionPlan        │   │   │
│                                      └───────────────────────────────────┘   │   │
│                                                                              │   │
│   ┌──────────────────────────────────────────────────────────────────────┐   │   │
│   │ 1:N Governance & Audit Child Entities                                │   │   │
│   ▼                                    ▼                                 ▼   │   │
│ ┌──────────────────────┐   ┌───────────────────────┐   ┌───────────────────┐ │   │
│ │     RiskDecision     │   │    PmkpReviewCycle    │   │  IncidentAddendum │ │   │
│ │ - initial_grade      │   │ - cycle_number (1..N) │   │ - author_user_id  │ │   │
│ │ - graded_by_user_id  │   │ - completeness (Y/N)  │   │ - narrative       │ │   │
│ │ - mitigation_notes   │   │ - rca_needed (Y/N)    │   │ - created_at_utc  │ │   │
│ │ - regraded_band      │   │ - pmkp_directives     │   └───────────────────┘ │   │
│ └──────────────────────┘   │ - evaluated_by_user   │                         │   │
│                            └───────────────────────┘                         │   │
│                                                                              │   │
│   ┌──────────────────────────────────────────────────────────────────────┐   │   │
│   │ 1:N Supporting Seams (Subject to Policy / Conditional)               │   │   │
│   ▼                                    ▼                                 ▼   │   │
│ ┌──────────────────────┐   ┌───────────────────────┐   ┌───────────────────┐ │   │
│ │  CorrectionRequest   │   │  IncidentAttachment   │   │    AuditRecord    │ │   │
│ │ - target: No. MR     │   │ - R2 object key       │   │ - actor attribution│ │  │
│ │ - before/after value │   │ - metadata & size     │   │ - state transition│ │   │
│ │ - requester/approver │   │ - CONDITIONAL: ADR-010│   │ - immutable append│ │   │
│ └──────────────────────┘   └───────────────────────┘   └───────────────────┘ │   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Aggregate Root and Sub-Entities Specification

### 4.1 Aggregate Root: `IncidentReport`

- **Purpose:** Acts as the transactional and concurrency consistency boundary for an incident report.
- **Attributes:**
  - `id`: Opaque, distributed unique primary key (UUIDv7 string).
  - `report_number`: Formatted display identifier (`IKP/IBS/YYYYMM/XXXX`), allocated atomically upon transition to `SUBMITTED`.
  - `owning_unit_id`: Foreign key referencing the responsible clinical unit (`units.id`).
  - `lifecycle_status`: Current lifecycle state (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `SIMPLE_INVESTIGATION`, `ESCALATED_TO_PMKP`, `SUBMITTED_TO_PMKP`, `PMKP_REVIEW`, `REVISION_REQUIRED`, `COMPLETED`, `COMPLETED_BY_UNIT`).
  - `created_by_user_id`: Foreign key referencing the authenticated creator.
  - `row_version`: Strictly incrementing integer for optimistic concurrency control (`If-Match` / `412 Precondition Failed`).
  - `created_at_utc`, `updated_at_utc`: Authoritative server timestamps.

### 4.2 Entity: `IncidentSubmissionSnapshot`

- **Purpose:** Captures the permanent, unalterable clinical event report exactly as submitted by the healthcare worker.
- **Immutability Contract:** Inserted atomically during the `SUBMIT_REPORT` command. **ZERO UPDATE or DELETE operations permitted.**
- **Attributes:**
  - `incident_report_id`: 1:1 reference to root aggregate.
  - Patient demographics (name, MR number, room, age cohort, gender, payer type, admission datetime).
  - Incident details (incident datetime, timezone, title, chronology narrative 5W+1H, incident type, initial finder, target subject, care setting, physical location, clinical specialization, causing unit, degree of harm, immediate actions taken, prior recurrence history).
  - Temporal calculations: `sla_deadline_utc`, `is_overdue_sla`, `overdue_reason`.
  - E-paraf attribution snapshot: `reporter_user_id`, `reporter_name`, `reporter_nip`, `reporter_role`, `reporter_unit`, `submitted_at_utc`, `request_id`.

### 4.3 Entity: `RiskDecision`

- **Purpose:** Records clinical risk grading and mitigations assigned by the Head of Room or PMKP committee.
- **Attributes:**
  - `incident_report_id`: FK to root aggregate.
  - `decision_type`: `INITIAL_GRADING` (by Kepala Ruangan) or `REGRADING` (by PMKP).
  - `risk_grade`: `BIRU`, `HIJAU`, `KUNING`, `MERAH`.
  - `high_risk_mitigation_notes`: Mandatory initial containment actions for KUNING/MERAH.
  - `decision_rationale`: Clinical justification.
  - `decided_by_user_id`, `decided_at_utc`, `request_id`: Full attribution snapshot.

### 4.4 Aggregate: `InvestigationRevision` (with Child Recommendations & Actions)

- **Purpose:** Manages the iterative findings, root-cause analyses, and action plans for BIRU/HIJAU incidents.
- **Attributes:**
  - `id`: Unique revision identifier.
  - `incident_report_id`: FK to root aggregate.
  - `revision_number`: Sequential integer (1, 2, ... N).
  - `direct_cause`, `underlying_root_cause`: Clinical causal analysis.
  - `investigation_start_date`, `investigation_end_date`: Date-only range (`end >= start`).
  - `approved_by_user_id`, `approved_at_utc`: Digital approval by Kepala Ruangan.
  - `is_submitted`: Freezes upon submission to PMKP.
- **Child Entity `InvestigationRecommendation`:** `revision_id`, `recommendation_text`, `responsible_person`, `target_date`, `order_index`.
- **Child Entity `InvestigationActionPlan`:** `revision_id`, `action_text`, `responsible_person`, `target_date`, `order_index`.

### 4.5 Entity: `PmkpReviewCycle`

- **Purpose:** Records each formal review by the PMKP quality committee without overwriting earlier evaluation history.
- **Attributes:**
  - `id`: Unique cycle identifier.
  - `incident_report_id`: FK to root aggregate.
  - `cycle_number`: Sequential integer (1, 2, ... N).
  - `evaluated_investigation_revision_id`: FK to the specific investigation revision evaluated.
  - `is_investigation_complete`: `YA` / `TIDAK`.
  - `is_further_investigation_needed`: `YA` / `TIDAK` (RCA requirement).
  - `pmkp_directives_and_notes`: Formal instructions returned to the unit head if incomplete.
  - `evaluated_by_user_id`, `evaluated_at_utc`, `request_id`: PMKP member attribution snapshot.

### 4.6 Entity: `IncidentAddendum` (Status: PENDING POLICY)

- **Purpose:** Append-only clinical or administrative clarifications arising after formal submission (`BR-04`).
- **Attributes:**
  - `id`: Unique addendum identifier.
  - `incident_report_id`: FK to root aggregate.
  - `addendum_sequence`: Integer sequence (1, 2, ...).
  - `author_user_id`: FK to authenticated creator.
  - `author_snapshot`: Full name, NIP, role, unit at moment of creation.
  - `content_narrative`: Appended facts.
  - `justification_reason`: Why information was appended post-submit.
  - `created_at_utc`, `request_id`: Immutable server stempel.

### 4.7 Entity: `CorrectionRequest` (Status: PENDING GOVERNANCE APPROVAL)

- **Purpose:** Formal audit trail for updating temporary Emergency Medical Record numbers without silent data mutation.
- **Attributes:**
  - `incident_report_id`: FK to root aggregate.
  - `field_name`: Strictly restricted to `medical_record_number`.
  - `before_value`: The submitted temporary MR (e.g. `EMERGENCY-20260926-01`).
  - `after_value`: The verified hospital permanent MR number.
  - `requester_user_id`, `requested_at_utc`.
  - `approver_user_id`, `approved_at_utc`.
  - `applied_at_utc`: When the correction was executed into the projection.

---

## 5. Specific Field Specification: Chronology Narrative

The **Kronologi Insiden (5W+1H)** is a medicolegally sensitive field detailing the sequence of clinical events leading to an incident.

- **Storage Representation:** Plain UTF-8 text (`TEXT` in SQLite / D1), preserving paragraph breaks (`\n`).
- **Candidate Size Ceiling:** Maximum 10,000 characters (~1,500–2,000 words). Exceeding this triggers client and server validation error `CHRONOLOGY_EXCEEDS_MAX_LENGTH`.
- **Formatting Policy:** Strictly plain text. No HTML or rich-text markup to prevent stored XSS and rendering discrepancies between browser and print stylesheet.
- **Logging Policy:** Under `functions/_shared/log-redaction.ts`, the key `chronology` and `chronology_narrative` is strictly redacted to `[REDACTED]`. Chronology text must NEVER be emitted to application logs, edge error traces, or console outputs.
- **Immutability Policy:** Once the `SUBMIT_REPORT` command is executed, the chronology narrative is permanently locked. Any additional chronological facts must be appended through `IncidentAddendum`.
