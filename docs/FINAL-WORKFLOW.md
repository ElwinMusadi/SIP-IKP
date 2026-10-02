# Final Workflow and State Transition Specification (Phase 07 Reconciled)

## 1. Scope and Authority

This document defines the definitive workflow state machine, lifecycle transitions, actor authorities, validation preconditions, and audit events for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

This specification operationalizes the **Decision Workshop (#1–#188)** business policies into an authoritative state machine ready for Cloudflare D1 production implementation and API command validation.

---

## 2. Canonical State Machine Overview

The workflow comprises exactly **8 canonical states**:

```text
               ┌────────────────────────┐
               │         DRAFT          │◄───────────────────────┐
               └───────────┬────────────┘                        │
                           │ SUBMIT_REPORT                       │
                           ▼                                     │
               ┌────────────────────────┐                        │
               │       SUBMITTED        │                        │
               └───────────┬────────────┘                        │
                           │                                     │
               ┌───────────┴────────────┐                        │
   RECEIVE_    │                        │ REQUEST_REVISION       │
   REPORT      ▼                        ▼                        │
   ┌───────────────────────┐  ┌───────────────────┐              │
   │     UNDER_REVIEW      │  │ REVISION_REQUIRED ├──────────────┘
   └───────────┬───────────┘  └───────────────────┘ (RESUBMIT_REPORT)
               │
               │ ASSIGN_RISK_GRADE
               ├──────────────────────────────────────────────┐
               │                                              │
               │ [BIRU / HIJAU]                               │ [KUNING / MERAH]
               │ tetap UNDER_REVIEW                           ▼
               ▼                                  ┌───────────────────────┐
    ┌───────────────────────────┐                  │      PMKP_REVIEW      │
    │ SIMPLE INVESTIGATION?     │                  └───────────┬───────────┘
    └────────────┬──────────────┘                              │
          YES    │    NO                                      │ FINALIZE_RCA_HANDOFF
          ▼      │    ▼                                       ▼
 ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
 │ SIMPLE_INVESTIGATION  │  │   COMPLETED_BY_UNIT   │  │       COMPLETED       │
 └───────────┬───────────┘  │       (TERMINAL)      │  │       (TERMINAL)      │
             │              └───────────────────────┘  └───────────────────────┘
             │ COMPLETE_INVESTIGATION
             ▼
 ┌───────────────────────┐
 │   COMPLETED_BY_UNIT   │
 │       (TERMINAL)      │
 └───────────────────────┘
```

---

## 3. Detailed State Catalog

| State Identifier           | Name & Business Purpose                                                             | Operational Owner                  | Who Can Access?                                           | Can Edit?                                 | Can Emergency Correct?                        |
| -------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| **`DRAFT`**                | Initial preparation of incident report (Parts I & II).                              | Owning `created_by`                | Private to `created_by` only                              | Yes (only `created_by`)                   | No (draft can be edited directly)             |
| **`SUBMITTED`**            | Officially submitted report. Form locked. In IBS review queue.                      | Queue of Kepala Ruangan IBS        | All IBS staff (view); Kepala Ruangan (manage)             | No (locked)                               | **Yes** (Kepala Ruangan IBS only)             |
| **`REVISION_REQUIRED`**    | Returned by Kepala Ruangan for correction.                                          | Owning `created_by`                | All IBS staff (view); `created_by` (edit)                 | Yes (only `created_by`)                   | No (author must resubmit)                     |
| **`UNDER_REVIEW`**         | Received by Kepala Ruangan; grading, initial analysis, and the BIRU/HIJAU investigation decision are in progress. | Scoped Kepala Ruangan IBS          | All IBS staff (view); Kepala Ruangan (manage)             | No                                        | **Yes** (Kepala Ruangan IBS only)             |
| **`SIMPLE_INVESTIGATION`** | Low/Moderate risk (`BIRU`/`HIJAU`). Unit head conducts investigation (Form page 3). | Scoped Kepala Ruangan IBS          | All IBS staff (view); Kepala Ruangan (edit investigation) | **No** (Locked to prevent clinical drift) | **NO** (Strictly forbidden post-entry)        |
| **`PMKP_REVIEW`**          | High/Extreme risk (`KUNING`/`MERAH`). Oversight review and RCA handoff preparation. | Queue of PMKP & Kepala Ruangan IBS | All IBS staff & PMKP (view); PMKP/Head (finalize)         | **No**                                    | **NO** (Strictly forbidden per Decision #181) |
| **`COMPLETED_BY_UNIT`**    | Terminal closure for `BIRU`/`HIJAU`, with a completed Simple Investigation or an explicit decision to finish without one. | Terminal Hospital Archive          | All IBS staff & PMKP (read-only view/export)              | **No (Terminal)**                         | **NO (Terminal)**                             |
| **`COMPLETED`**            | Terminal closure for `KUNING`/`MERAH` incidents upon external RCA handoff.          | Terminal Hospital Archive          | All IBS staff & PMKP (read-only view/export)              | **No (Terminal)**                         | **NO (Terminal)**                             |

---

## 4. Definitive Transition Matrix

| Current State                 | Command / Action         | Permitted Actor                                     | Validation Preconditions & Rules                                                                                                                                                                                             | Next State                              | Audit Event Emitted                                                  |
| ----------------------------- | ------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| None                          | `CREATE_DRAFT`           | `TENAGA_KESEHATAN`, `KEPALA_RUANGAN`, `KOMITE_PMKP` | Authenticated staff account. Non-empty minimum draft: (1) reporter name/role, (2) incident date/time, (3) incident type.                                                                                                     | `DRAFT`                                 | `DRAFT_CREATED`                                                      |
| `DRAFT`                       | `SAVE_DRAFT`             | Owning `created_by`                                 | Authenticated; user must be `created_by`. Validates provided field types. Updates `updated_at`.                                                                                                                              | `DRAFT`                                 | None (unretained routine save)                                       |
| `DRAFT`                       | `DELETE_DRAFT`           | Owning `created_by`                                 | User must be `created_by`. Hard deletes record and associated draft data from D1.                                                                                                                                            | None (Deleted)                          | None (unretained after hard delete)                                  |
| `DRAFT`                       | `SUBMIT_REPORT`          | Owning `created_by`                                 | User must be `created_by`. **All mandatory Form fields (Bagian I & II) must be complete.** If overdue (>48h), `overdue_reason` mandatory.                                                                                    | `SUBMITTED`                             | `REPORT_SUBMITTED`                                                   |
| `SUBMITTED`                   | `RECEIVE_REPORT`         | `KEPALA_RUANGAN` (IBS)                              | Authenticated active Kepala Ruangan IBS. Acknowledges receipt of report.                                                                                                                                                     | `UNDER_REVIEW`                          | None (status advanced; receipt captured in report)                   |
| `SUBMITTED` or `UNDER_REVIEW` | `REQUEST_REVISION`       | `KEPALA_RUANGAN` (IBS)                              | Kepala Ruangan requests author to correct/clarify facts. `revision_reason` is optional.                                                                                                                                      | `REVISION_REQUIRED`                     | `REVISION_REQUIRED`                                                  |
| `REVISION_REQUIRED`           | `RESUBMIT_REPORT`        | Owning `created_by`                                 | User must be `created_by`. Corrects fields; validates all mandatory fields. Advances to `SUBMITTED`.                                                                                                                         | `SUBMITTED`                             | `REPORT_SUBMITTED` (no separate resubmit event)                      |
| `UNDER_REVIEW`                | `ASSIGN_RISK_GRADE`      | `KEPALA_RUANGAN` (IBS)                              | Manual clinical selection: `BIRU`, `HIJAU`, `KUNING`, `MERAH`; current `row_version` required.<br>- `BIRU`/`HIJAU`: grade is stored and status remains `UNDER_REVIEW` for the explicit investigation decision.<br>- `KUNING`/`MERAH`: initial mitigation notes mandatory and status advances to `PMKP_REVIEW`. | `UNDER_REVIEW` or `PMKP_REVIEW` | None (grade and routing are captured in the report) |
| `UNDER_REVIEW` (`BIRU`/`HIJAU`) | `START_SIMPLE_INVESTIGATION` | `KEPALA_RUANGAN` (IBS)                           | Grade must already be `BIRU` or `HIJAU`; current `If-Match` / `row_version` required; creates the single investigation record only after the guarded transition succeeds. | `SIMPLE_INVESTIGATION` | None (minimal audit model has no start event) |
| `UNDER_REVIEW` (`BIRU`/`HIJAU`) | `COMPLETE_WITHOUT_INVESTIGATION` | `KEPALA_RUANGAN` (IBS)                        | Explicit terminal confirmation; current `If-Match` / `row_version` required; no Simple Investigation record may be created. | `COMPLETED_BY_UNIT` | `REPORT_COMPLETED` |
| `SUBMITTED` or `UNDER_REVIEW` | `EMERGENCY_CORRECTION`   | `KEPALA_RUANGAN` (IBS)                              | **Actor strictly Kepala Ruangan IBS.** Mandatory reason (1–500 chars). Can modify allowed business fields, including Risk Grade.                                                                                             | Current State                           | `EMERGENCY_CORRECTION`                                               |
| `SIMPLE_INVESTIGATION`        | `COMPLETE_INVESTIGATION` | `KEPALA_RUANGAN` (IBS)                              | All Form page 3 investigation fields mandatory: causes, recommendations, action plans, start/end dates (`end >= start`). Explicit completion command and current `If-Match` / `row_version`. | `COMPLETED_BY_UNIT` | `SIMPLE_INVESTIGATION_COMPLETED`, then `REPORT_COMPLETED` |
| `PMKP_REVIEW`                 | `UPDATE_PMKP_REVIEW`     | `KOMITE_PMKP`                                       | Optional review note. Allowed only while `pmkp_reviewed = false`.                                                                                                                                                            | `PMKP_REVIEW`                           | None                                                                 |
| `PMKP_REVIEW`                 | `FINALIZE_RCA_HANDOFF`   | `KOMITE_PMKP` or `KEPALA_RUANGAN`                   | External RCA handoff confirmed in dialog. Atomically sets `pmkp_reviewed = true` and `REPORT_COMPLETED` audit event. Terminal closure.                                                                                       | `COMPLETED`                             | `REPORT_COMPLETED`                                                   |

---

## 5. Emergency Correction Temporal Boundary Specification

Emergency Correction is a powerful administrative-clinical override capability strictly governed by Decision Workshop rules:

1. **Authorized Actor:** Strictly and exclusively `KEPALA_RUANGAN` IBS.
2. **Permitted Window:** Allowed **ONLY** when lifecycle status is `SUBMITTED` or `UNDER_REVIEW`.
3. **Strict Prohibition Window:**
   - **FORBIDDEN** when status is `SIMPLE_INVESTIGATION` (investigation in progress locks correction).
   - **FORBIDDEN** when status is `PMKP_REVIEW` (Decision #181 explicitly supersedes and bans correction during PMKP review).
   - **FORBIDDEN** when status is `COMPLETED_BY_UNIT` or `COMPLETED` (terminal states are permanent).
4. **Mandatory Reason:** Reason field is mandatory, free-text between 1 and 500 characters after trimming whitespace.
5. **No History Overwrite Confusion:** A single `EMERGENCY_CORRECTION` audit event is emitted per correction action, recording actor, timestamp, reason, and Request ID. No old values are displayed in audit UI.

---

## 6. Prohibited Transitions (Negative Test Invariants)

The backend API and database constraints must strictly reject the following operations:

1. Unsubmitting a submitted report (`SUBMITTED` -> `DRAFT` is impossible).
2. Direct editing of draft content by anyone other than `created_by`.
3. Deleting a submitted, under-review, or completed incident (only drafts may be deleted).
4. Assigning or modifying a Risk Grade after `SIMPLE_INVESTIGATION` or `PMKP_REVIEW` has started.
5. Completing a Simple Investigation without completing all mandatory Form page 3 fields.
6. Reopening or mutating an incident in `COMPLETED_BY_UNIT` or `COMPLETED`.
7. Executing Emergency Correction during `PMKP_REVIEW`, `SIMPLE_INVESTIGATION`, or terminal states.
8. Generating unauthorized audit event types outside the minimal 7 approved events.
