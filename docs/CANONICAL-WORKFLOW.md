# Canonical Workflow and State Transition Specification

## 1. Scope and Authority

This document defines the canonical workflow state machine, transition contracts, actor responsibilities, preconditions, and audit events for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**GOVERNANCE STATUS: HISTORICAL PROVISIONAL SPECIFICATION. `FINAL-WORKFLOW.md` is the current implementation authority. The Phase 16 decision-step delta below supersedes conflicting provisional transitions in this document.**

### Phase 16 Current Workflow Delta

For an incident in `UNDER_REVIEW`, assigning `BIRU` or `HIJAU` stores the grade but deliberately retains `UNDER_REVIEW`. The Kepala Ruangan then makes an explicit, server-enforced decision:

```text
Risk Grading BIRU/HIJAU
        ↓
Simple Investigation?
├── YES → SIMPLE_INVESTIGATION → COMPLETED_BY_UNIT
└── NO  → COMPLETED_BY_UNIT
```

The NO path creates no `simple_investigations` row and emits only `REPORT_COMPLETED`. The YES transition creates the 1:1 investigation record but emits no start event because the approved minimal audit model has no start event. Both commands require the current `If-Match` / `row_version`. KUNING/MERAH continue directly to `PMKP_REVIEW` with mandatory mitigation notes. No status, table, column, migration, or audit type is added.

This specification supersedes all informal narrative descriptions. Every lifecycle transition in the application must be executed through an explicit named domain command conforming to this matrix. Generic status updates (`PATCH status=...`) are strictly prohibited.

---

## 2. Canonical State Catalog

| State Identifier           | State Name & Meaning                                                                                           | Lifecycle Nature                      | Operational Owner             | Entry Criteria                                                                                       | Exit Criteria                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **`DRAFT`**                | Initial report preparation by healthcare worker. Parts I & II can be saved and edited.                         | Non-terminal (Working)                | Owning `TENAGA_KESEHATAN`     | User clicks "Buat Laporan Baru" (`/insiden/baru`).                                                   | Formal submit command executed, or draft abandoned.                                                      |
| **`SUBMITTED`**            | Report officially submitted. Clinical submission snapshot is permanently locked. Awaiting verification.        | Non-terminal (Queued)                 | Queue of `KEPALA_RUANGAN` IBS | Formal submission valid; SLA deadline calculated; overdue reason present if >48h.                    | Acknowledged & received by Kepala Ruangan.                                                               |
| **`UNDER_REVIEW`**         | Report received by Kepala Ruangan IBS. Review and manual risk grading in progress.                             | Non-terminal (Active)                 | Scoped `KEPALA_RUANGAN` IBS   | Kepala Ruangan acknowledges receipt; receipt audit event captured.                                   | Risk grade assigned (Biru/Hijau -> Simple Investigation; Kuning/Merah -> Escalated; or Unit Completion). |
| **`SIMPLE_INVESTIGATION`** | Low/moderate risk incident (`BIRU` or `HIJAU`). Unit head conducts investigation and prepares action plans.    | Non-terminal (Active)                 | Scoped `KEPALA_RUANGAN` IBS   | Initial grade assigned as `BIRU` or `HIJAU`.                                                         | Simple investigation completed, approved by unit head, and submitted to PMKP.                            |
| **`ESCALATED_TO_PMKP`**    | High/extreme risk incident (`KUNING` or `MERAH`). Initial mitigation recorded; escalated to quality committee. | Non-terminal (Queued)                 | Queue of `KOMITE_PMKP`        | Initial grade assigned as `KUNING` or `MERAH` with mandatory mitigation notes.                       | PMKP reviewer opens and acknowledges intake.                                                             |
| **`SUBMITTED_TO_PMKP`**    | Simple investigation worksheet approved by unit head and submitted for committee evaluation.                   | Non-terminal (Queued)                 | Queue of `KOMITE_PMKP`        | Unit head approves investigation revision with valid dates and recommendations.                      | PMKP reviewer opens and acknowledges intake.                                                             |
| **`PMKP_REVIEW`**          | PMKP committee actively evaluates investigation completeness and decides on RCA need.                          | Non-terminal (Active)                 | Scoped `KOMITE_PMKP` Member   | PMKP member opens review intake.                                                                     | Completeness verified (decision table applied); either returned for revision or completed.               |
| **`REVISION_REQUIRED`**    | PMKP evaluated investigation as incomplete and returned it with formal directives to unit head.                | Non-terminal (Active)                 | Scoped `KEPALA_RUANGAN` IBS   | PMKP review records `is_investigation_complete = TIDAK` with non-empty directives.                   | Unit head prepares and resubmits new investigation revision.                                             |
| **`COMPLETED`**            | Official hospital quality committee closure. Final case disposition reached.                                   | **TERMINAL (Frozen)**                 | PMKP / Hospital Record        | Investigation complete (`YA`), further RCA not needed (`TIDAK`), regrade consequences resolved.      | Case permanently archived. Direct mutation forbidden.                                                    |
| **`COMPLETED_BY_UNIT`**    | Unit-level closure for an approved very-minor KNC category (`BR-09`).                                          | **TERMINAL (Conditional / Disabled)** | Unit Head / Hospital Record   | **DISABLED PENDING POLICY (`DM-005`):** Objective KNC-minor criteria and oversight must be approved. | Case permanently archived.                                                                               |

---

## 3. Milestones Evaluated but NOT Persisted as Standalone States

- **`RISK_GRADED`:** Risk grading remains an attribute, not a durable state. BIRU/HIJAU stays in owned status `UNDER_REVIEW` until the explicit investigation decision; KUNING/MERAH routes to `PMKP_REVIEW`.
- **`RESUBMITTED`:** Resubmission is a version boundary event (`RESUBMIT_INVESTIGATION`). The report returns to `SUBMITTED_TO_PMKP` with an incremented revision number.
- **`ON_HOLD` / `RCA_IN_PROGRESS`:** Rejected / Deferred. The Blueprint places interactive RCA post-MVP (`docs/AI-Product-Blueprint-*.md:89-90`). No intermediate RCA state may be invented until stakeholders define the RCA lifecycle.

---

## 4. Canonical Transition Matrix

| Current State          | Actor Role         | Domain Action              | Preconditions & Validation Rules                                                                                                         | Next State             | Audit Event Emitted          | Implementation Status         |
| ---------------------- | ------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------- | ----------------------------- |
| None                   | `TENAGA_KESEHATAN` | `CREATE_DRAFT`             | Authenticated staff account; assigned to clinical reporting unit; generates draft aggregate.                                             | `DRAFT`                | `DRAFT_CREATED`              | Active Candidate              |
| `DRAFT`                | `TENAGA_KESEHATAN` | `SAVE_DRAFT`               | Owning reporter; partial validation passes; optimistic `row_version` matches.                                                            | `DRAFT`                | `DRAFT_SAVED`                | Active Candidate              |
| `DRAFT`                | `TENAGA_KESEHATAN` | `SUBMIT_REPORT`            | Owning reporter; all mandatory fields present; incident time valid; if overdue (>48h), `overdue_reason` present; user confirms accuracy. | `SUBMITTED`            | `REPORT_SUBMITTED`           | Active Candidate              |
| `SUBMITTED`            | `KEPALA_RUANGAN`   | `RECEIVE_REPORT`           | Assigned to owning unit (`IBS`); report not previously received; optimistic version current.                                             | `UNDER_REVIEW`         | `REPORT_RECEIVED`            | Active Candidate              |
| `UNDER_REVIEW`         | `KEPALA_RUANGAN`   | `ASSIGN_LOW_RISK_GRADE`    | Assigned to unit; manual grade selected as `BIRU` or `HIJAU`; rationale optional.                                                        | `SIMPLE_INVESTIGATION` | `RISK_GRADED_LOW`            | Active Candidate              |
| `UNDER_REVIEW`         | `KEPALA_RUANGAN`   | `ASSIGN_HIGH_RISK_GRADE`   | Assigned to unit; manual grade selected as `KUNING` or `MERAH`; `high_risk_mitigation_notes` mandatory.                                  | `ESCALATED_TO_PMKP`    | `RISK_GRADED_HIGH_ESCALATED` | Active Candidate              |
| `UNDER_REVIEW`         | `KEPALA_RUANGAN`   | `CLOSE_VERY_MINOR_KNC`     | **DISABLED:** Policy for "KNC sangat minor" is unapproved (`DM-005`).                                                                    | `COMPLETED_BY_UNIT`    | `CLOSED_BY_UNIT`             | **DISABLED / PENDING POLICY** |
| `SIMPLE_INVESTIGATION` | `KEPALA_RUANGAN`   | `SAVE_INVESTIGATION_DRAFT` | Assigned to unit; current working revision is draft; saves causes, recommendations, actions.                                             | `SIMPLE_INVESTIGATION` | `INVESTIGATION_DRAFT_SAVED`  | Active Candidate              |
| `SIMPLE_INVESTIGATION` | `KEPALA_RUANGAN`   | `SUBMIT_INVESTIGATION`     | Assigned to unit; causes non-empty; at least 1 recommendation and action; `end_date >= start_date` (`BR-08`); head approval confirmed.   | `SUBMITTED_TO_PMKP`    | `INVESTIGATION_SUBMITTED`    | Active Candidate              |
| `ESCALATED_TO_PMKP`    | `KOMITE_PMKP`      | `OPEN_PMKP_REVIEW`         | Assigned PMKP scope; high-risk mitigation record present.                                                                                | `PMKP_REVIEW`          | `PMKP_REVIEW_OPENED`         | Active Candidate              |
| `SUBMITTED_TO_PMKP`    | `KOMITE_PMKP`      | `OPEN_PMKP_REVIEW`         | Assigned PMKP scope; submitted investigation revision present.                                                                           | `PMKP_REVIEW`          | `PMKP_REVIEW_OPENED`         | Active Candidate              |
| `PMKP_REVIEW`          | `KOMITE_PMKP`      | `REQUEST_REVISION`         | Simple investigation branch; `is_investigation_complete = TIDAK`; non-empty `pmkp_directives_and_notes`.                                 | `REVISION_REQUIRED`    | `REVISION_REQUESTED`         | Active Candidate              |
| `REVISION_REQUIRED`    | `KEPALA_RUANGAN`   | `RESUBMIT_INVESTIGATION`   | Assigned to unit; creates new `InvestigationRevision` (N+1); addresses directives; valid dates; head approves.                           | `SUBMITTED_TO_PMKP`    | `INVESTIGATION_RESUBMITTED`  | Active Candidate              |
| `PMKP_REVIEW`          | `KOMITE_PMKP`      | `REGRADE_INCIDENT`         | Same-branch regrade permitted in review draft (`BIRU <-> HIJAU` or `KUNING <-> MERAH`). Branch-changing regrade is BLOCKED (`DM-007`).   | `PMKP_REVIEW`          | `INCIDENT_REGRADED`          | Conditional / Partial         |
| `PMKP_REVIEW`          | `KOMITE_PMKP`      | `COMPLETE_REPORT`          | `is_investigation_complete = YA`; `is_further_investigation_needed = TIDAK`; any regrade resolved; completion intent confirmed.          | `COMPLETED`            | `REPORT_COMPLETED`           | Active Candidate              |
| `PMKP_REVIEW`          | `KOMITE_PMKP`      | `REFER_FOR_RCA`            | `is_further_investigation_needed = YA`. **BLOCKED:** Terminal RCA handoff is unapproved (`DM-006`).                                      | **BLOCKED**            | `RCA_REFERRED`               | **BLOCKED / PENDING POLICY**  |

---

## 5. PMKP Evaluation Decision Truth Table

| `is_investigation_complete` | `is_further_investigation_needed` | Allowed PMKP Command | Resulting State     | Governance Rule                                                                                                                                                                                 |
| --------------------------- | --------------------------------- | -------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TIDAK`                     | Any                               | `REQUEST_REVISION`   | `REVISION_REQUIRED` | Mandatory return to unit head with formal directives (`FR-05`).                                                                                                                                 |
| `YA`                        | `TIDAK`                           | `COMPLETE_REPORT`    | `COMPLETED`         | Official case closure. Incident is permanently frozen (`BR-09`).                                                                                                                                |
| `YA`                        | `YA`                              | `REFER_FOR_RCA`      | **BLOCKED**         | **BLOCKED (`DM-006`):** The system must not complete an incident when further RCA is required, but interactive RCA is post-MVP. Case cannot close until stakeholder handoff policy is approved. |
| Unspecified                 | Any                               | None                 | `PMKP_REVIEW`       | Evaluation remains in draft. Case cannot transition.                                                                                                                                            |

---

## 6. Prohibited Transitions (Security Invariants)

The backend must reject all unlisted transitions with `409 Conflict` or `403 Forbidden`. The following transitions are explicitly forbidden:

1. `DRAFT` directly to `UNDER_REVIEW`, `SUBMITTED_TO_PMKP`, or `COMPLETED`.
2. `SUBMITTED` transitioning backwards to `DRAFT`.
3. `SUBMITTED` directly to `COMPLETED` without unit review or grading.
4. `UNDER_REVIEW` to PMKP without an explicit risk grade (`BIRU`, `HIJAU`, `KUNING`, `MERAH`).
5. Low-risk incidents (`BIRU`, `HIJAU`) bypassing simple investigation to `ESCALATED_TO_PMKP`.
6. High-risk incidents (`KUNING`, `MERAH`) entering `SIMPLE_INVESTIGATION` as the default unit path.
7. `REVISION_REQUIRED` transitioning directly to `COMPLETED` without resubmission and PMKP re-evaluation.
8. Any role other than `KOMITE_PMKP` executing `COMPLETE_REPORT`.
9. Any role other than `KEPALA_RUANGAN` executing `ASSIGN_LOW_RISK_GRADE` or `ASSIGN_HIGH_RISK_GRADE`.
10. `COMPLETED` transitioning to any active state without a formal, approved reopening workflow.
