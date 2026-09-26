# Phase 08 Implementation Report: Incident Reporting & Core Workflow

## 1. Executive Summary and Status

# STATUS: READY_FOR_PHASE_09

Phase 08 delivers the first complete business feature of the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

The application is now operational end-to-end for:

1. Authenticated incident creation with minimum draft constraints.
2. Server-side auto-save with optimistic concurrency (`If-Match` / `412`).
3. Private draft ownership and draft hard deletion.
4. Formal submission with mandatory Bagian I & II Form validation, SLA 48h tracking, canonical report number allocation (`IKP/IBS/YYYYMM/XXXX`), formal submission snapshotting, and `REPORT_SUBMITTED` audit capture.
5. Peer visibility for Nakes IBS and clinical narrative protection for administrators.
6. Head of Room review (`UNDER_REVIEW`), revision return (`REVISION_REQUIRED`), and resubmission.
7. Manual risk grading (`BIRU`, `HIJAU`, `KUNING`, `MERAH`) and branch routing.
8. Emergency Correction by Kepala Ruangan IBS with mandatory 1–500 char justification.
9. Simple Investigation worksheet (Bagian III) with date validation (`end >= start`), dynamic recommendation/action rows, and unit-level completion (`COMPLETED_BY_UNIT`).
10. PMKP Review notes and external RCA handoff finalization (`COMPLETED`).
11. Minimal 7-event audit trail timeline.

---

## 2. Implemented Features

### 2.1 Incident Report Creation & Minimum Draft

- Authorized roles: `TENAGA_KESEHATAN`, `KEPALA_RUANGAN`, `KOMITE_PMKP` (strictly denied to `ADMINISTRATOR`).
- `created_by` = authenticated user ID.
- `reporter_name` and `reporter_role` can differ from `created_by` without special confirmation.
- Minimum draft requirement: `reporter_name`, `reporter_role`, `incident_datetime`, `incident_type`. Empty drafts are rejected.
- Emits `DRAFT_CREATED` audit event upon first persistent save in D1.

### 2.2 Server-Side Auto-Save & Concurrency Control

- Auto-save triggers on field changes and sends updates to `PATCH /api/incidents/:id/draft`.
- Explicit "Simpan Draf" button available.
- Visual auto-save indicators: _"Semua perubahan tersimpan"_, _"Belum tersimpan"_, _"Menyimpan..."_, _"Terjadi kesalahan saat menyimpan"_.
- Leave page protection warns user if unsaved changes exist.
- Concurrency protection: `row_version` integer incremented on mutation. Stale requests evaluated against `If-Match` ETag return `HTTP 412 Precondition Failed`.

### 2.3 Draft Ownership and Deletion

- Drafts are strictly private to `created_by`. Non-authors receive `HTTP 403 Forbidden`.
- `DELETE /api/incidents/:id` executes hard delete in D1. Zero audit records are retained post-deletion.

### 2.4 Formal Report Submission & SLA Tracking

- Fixed, non-conditional mandatory validation for all Bagian I and Bagian II Form fields.
- Server SLA 48h calculation:
  - `deadline = incident_datetime + 48 hours`.
  - `is_overdue_sla = now > deadline`.
  - If overdue, non-empty `overdue_reason` is mandatory.
- Atomically allocates sequential report number: `IKP/IBS/YYYYMM/XXXX`.
- Atomically inserts `incident_submission_snapshots` and `REPORT_SUBMITTED` audit event in a single D1 batch.
- Submissions cannot be unsubmitted.

### 2.5 Head of Room Review & Revision Loop

- `POST /api/incidents/:id/receive`: Advances `SUBMITTED` -> `UNDER_REVIEW`, recording `received_by_user_id` and timestamp.
- `POST /api/incidents/:id/revision-required`: Advances to `REVISION_REQUIRED` with optional `revision_reason`. Emits `REVISION_REQUIRED` audit event.
- Only `created_by` can edit and resubmit a revision. Resubmission emits `REPORT_SUBMITTED`. Unlimited revision cycles supported.

### 2.6 Manual Risk Grading

- Evaluated in `UNDER_REVIEW` by Kepala Ruangan IBS.
- Manual clinical selection: `BIRU`, `HIJAU`, `KUNING`, `MERAH`. Zero automatic scoring formulas.
- `BIRU` / `HIJAU` -> dispatches to `SIMPLE_INVESTIGATION`, initializes worksheet.
- `KUNING` / `MERAH` -> dispatches to `PMKP_REVIEW`, mandates non-empty `high_risk_mitigation_notes`.

### 2.7 Emergency Correction

- Actor strictly `KEPALA_RUANGAN` IBS.
- Allowed **ONLY** during `SUBMITTED` or `UNDER_REVIEW`. Strictly forbidden once Simple Investigation or PMKP Review starts.
- Mandatory justification (1–500 chars trimmed).
- Updates both `incident_reports` and `incident_submission_snapshots`.
- Emits single `EMERGENCY_CORRECTION` audit event.

### 2.8 Simple Investigation Worksheet (Bagian III)

- Form page 3 fields: `direct_cause`, `underlying_root_cause`, `investigation_start_date`, `investigation_end_date` (enforces `end >= start`), recommendations, and actions.
- Dynamic tabular rows for recommendations and actions.
- Completion requires 100% mandatory investigation fields.
- Sets `completed_by_user_id = user.id`, advances to `COMPLETED_BY_UNIT` (terminal).
- Emits `SIMPLE_INVESTIGATION_COMPLETED` and `REPORT_COMPLETED` audit events.

### 2.9 PMKP Review & External RCA Handoff

- In `PMKP_REVIEW`, PMKP can save review notes while `pmkp_reviewed = 0`.
- Finalization confirmed by dialog; executed by PMKP or Kepala Ruangan.
- Sets `pmkp_reviewed = 1`, advances to `COMPLETED` (terminal).
- Emits `REPORT_COMPLETED` audit event.

### 2.10 Audit Trail

- Strictly limited to 7 minimal events: `DRAFT_CREATED`, `REPORT_SUBMITTED`, `REVISION_REQUIRED`, `SIMPLE_INVESTIGATION_COMPLETED`, `REPORT_COMPLETED`, `EMERGENCY_CORRECTION` (and un-retained `DRAFT_DELETED`).
- Displays event, actor name, actor role, timestamp, notes, and Request ID.
- Old/new values and changed field lists are strictly omitted per workshop decision.

---

## 3. Workflow State Machine Implemented

```text
DRAFT (Private to created_by)
  │
  ├── SUBMIT_REPORT
  ▼
SUBMITTED (In IBS Queue)
  │
  ├── RECEIVE_REPORT
  ▼
UNDER_REVIEW (Kepala Ruangan IBS)
  │
  ├── REQUEST_REVISION ──► REVISION_REQUIRED ──► RESUBMIT_REPORT ──► SUBMITTED
  │
  ├── ASSIGN_RISK_GRADE (BIRU / HIJAU)
  ▼
SIMPLE_INVESTIGATION (Form Page 3)
  │
  ├── COMPLETE_INVESTIGATION
  ▼
COMPLETED_BY_UNIT (Terminal Closure)

  [Or from UNDER_REVIEW with KUNING / MERAH]
  │
  ├── ASSIGN_RISK_GRADE (KUNING / MERAH with Mitigation)
  ▼
PMKP_REVIEW (Quality Committee Oversight)
  │
  ├── FINALIZE_RCA_HANDOFF
  ▼
COMPLETED (Terminal Closure)
```

---

## 4. API Endpoints Created

| Endpoint                                    | Method   | Role & Permission        | Description                                                                                          |
| ------------------------------------------- | -------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `/api/master-data`                          | `GET`    | Public / All             | Fetches active operating rooms, specializations, departments, payer types                            |
| `/api/incidents`                            | `GET`    | Nakes, Head, PMKP, Admin | Lists incidents with peer visibility for Nakes IBS; admin narrative sanitized                        |
| `/api/incidents`                            | `POST`   | Nakes, Head, PMKP        | Creates persistent draft with minimum draft validation; emits `DRAFT_CREATED`                        |
| `/api/incidents/:id`                        | `GET`    | Scoped by report         | Fetches incident detail, investigation worksheet, and submission snapshot                            |
| `/api/incidents/:id`                        | `PATCH`  | `created_by` only        | Auto-saves / updates draft fields with concurrency check (`If-Match`)                                |
| `/api/incidents/:id/draft`                  | `PATCH`  | `created_by` only        | Alias for draft auto-save                                                                            |
| `/api/incidents/:id`                        | `DELETE` | `created_by` only        | Hard deletes draft and associated data; zero audit retained                                          |
| `/api/incidents/:id/submit`                 | `POST`   | `created_by` only        | Submits report, validates all fields, calculates SLA, creates snapshot, emits `REPORT_SUBMITTED`     |
| `/api/incidents/:id/receive`                | `POST`   | `KEPALA_RUANGAN` only    | Receives submitted report -> `UNDER_REVIEW`                                                          |
| `/api/incidents/:id/revision-required`      | `POST`   | `KEPALA_RUANGAN` only    | Requests revision with optional reason -> `REVISION_REQUIRED`, emits `REVISION_REQUIRED`             |
| `/api/incidents/:id/assign-risk-grade`      | `POST`   | `KEPALA_RUANGAN` only    | Assigns manual grade (`BIRU`, `HIJAU`, `KUNING`, `MERAH`) and routes workflow branch                 |
| `/api/incidents/:id/emergency-correction`   | `POST`   | `KEPALA_RUANGAN` only    | Corrects data during `SUBMITTED`/`UNDER_REVIEW` with 1–500 char reason; emits `EMERGENCY_CORRECTION` |
| `/api/incidents/:id/investigation`          | `GET`    | IBS Staff                | Reads current simple investigation worksheet                                                         |
| `/api/incidents/:id/investigation`          | `PUT`    | `KEPALA_RUANGAN` only    | Updates simple investigation worksheet (overwrites single record)                                    |
| `/api/incidents/:id/investigation/complete` | `POST`   | `KEPALA_RUANGAN` only    | Validates page 3 fields and completes investigation -> `COMPLETED_BY_UNIT`                           |
| `/api/incidents/:id/pmkp-review`            | `GET`    | IBS Staff                | Reads PMKP review notes and review status                                                            |
| `/api/incidents/:id/pmkp-review`            | `PUT`    | `KOMITE_PMKP` only       | Updates PMKP review note while `pmkp_reviewed = 0`                                                   |
| `/api/incidents/:id/pmkp-review/finalize`   | `POST`   | PMKP / Head of Room      | Finalizes external RCA handoff -> `COMPLETED`                                                        |
| `/api/incidents/:id/audit`                  | `GET`    | Scoped by report         | Reads audit trail records (events and metadata only; no old/new values)                              |

---

## 5. Database Schema Changes

- **Migration Added:** `database/migrations/0002_submission_snapshots.sql`
  - Adds column `similar_incident_details TEXT` to `incident_reports`.
  - Creates table `incident_submission_snapshots` (`id`, `incident_id UNIQUE`, `report_number`, `snapshot_data`, `patient_name`, `medical_record_number`, `incident_datetime`, `incident_type`, `is_overdue_sla`, `overdue_reason`, `submitted_by_user_id`, `submitted_at`, `created_at`, `updated_at`).
  - Added index `idx_snapshots_incident_id`.
- Local production database reset and re-validated cleanly via `npm run d1:reset && npm run d1:validate`.

---

## 6. Verification & Validation Summary

All 16 test suites and 78 automated tests pass with 100% success:

| Test Suite                                           | Tests | Result   | Focus Areas                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `functions/api/incidents/incidents-workflow.test.ts` | 13    | **PASS** | Draft creation, draft privacy, auto-save concurrency, hard delete, submit validation, SLA calculation, peer read, admin sanitization, revision loop, emergency correction, BIRU investigation completion, KUNING PMKP completion, audit trail retrieval |
| `functions/_shared/incident-service.test.ts`         | 11    | **PASS** | Minimum draft validation, SLA boundary (<48h, ==48h, >48h), mandatory submission fields validation, investigation completion validation, atomic report number allocation (`IKP/IBS/YYYYMM/XXXX`)                                                        |
| `test-support/d1/production-d1.test.ts`              | 6     | **PASS** | DDL integrity, foreign keys, status check constraints, minimal 7 audit events check, 1:1 investigation constraint                                                                                                                                       |
| `functions/api/auth/auth.test.ts`                    | 5     | **PASS** | Login, logout, session verification, cookie handling, CSRF token delivery                                                                                                                                                                               |
| `functions/_shared/password.test.ts`                 | 4     | **PASS** | Web Crypto PBKDF2 hashing, salt generation, constant-time verification                                                                                                                                                                                  |
| `functions/_shared/rbac.test.ts`                     | 9     | **PASS** | RBAC rules, Nakes peer visibility, draft privacy, emergency correction boundaries, admin narrative sanitization                                                                                                                                         |
| `functions/_shared/audit.test.ts`                    | 2     | **PASS** | Minimal 7 audit events enforcement, prepared statement generation                                                                                                                                                                                       |
| `functions/_shared/response.test.ts`                 | 2     | **PASS** | Standard envelope, RFC 9457 problem details                                                                                                                                                                                                             |
| `functions/middleware.test.ts`                       | 4     | **PASS** | Request ID propagation, session resolution, CSRF header verification and rejection                                                                                                                                                                      |
| Other infrastructure suites                          | 22    | **PASS** | Log redaction, request ID, API harness, health, synthetic fixtures, D1 test harness, foundation                                                                                                                                                         |

### Build and Lint Validation:

- `npm run typecheck`: **PASS (0 errors)**
- `npm run lint`: **PASS (0 errors, 1 harmless React Hook Form compiler warning)**
- `npm run format:check`: **PASS (0 format issues)**
- `npm run build`: **PASS (Client compiled in 2.70s)**
- `npm run cf:validate`: **PASS (Worker compiled successfully)**
- `npm run d1:validate`: **PASS (Local production D1 validation passed)**

---

## 7. Scope Guard Audit

- Zero Addenda implemented: **PASS**
- Zero Cloudflare R2 attachments implemented: **PASS**
- Zero RCA interactive module implemented: **PASS**
- Zero PDF export implemented: **PASS**
- Zero analytics dashboard implemented: **PASS**
- Zero hospital-wide expansion implemented: **PASS**
- Zero real patient or staff clinical data: **PASS**
- Zero secrets committed: **PASS**

---

## 8. Git Information

- **Branch:** `main`
- **Commit Message:** `feat(phase-08): implement incident reporting and core workflow`
- **Remote:** `origin/main`
- **Working Tree:** **CLEAN**

---

## 9. Recommendation for Phase 09

**Proceed to Phase 09 — Formal PDF Generation, Reporting & Accreditation Output.**  
With the core reporting, review, grading, simple investigation, and PMKP handoff workflows completely operational and verified, Phase 09 can implement formal Form IKP PDF generation (`/insiden/:id/cetak`), filtered search, and accreditation print rendering.
