# Incident Reporting and Core Workflow API Specification

## 1. Protocol Conventions

- **Base Path:** `/api`
- **Response Format:** JSON envelope `{ "data": ..., "meta": { "requestId": "..." } }`
- **Error Format:** RFC 9457 Problem Details (`application/problem+json`)
- **Headers:**
  - `X-Request-ID`: Generated or validated request tracking identifier.
  - `X-CSRF-Token`: Synchronizer anti-CSRF token required on all mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`).
  - `If-Match`: Required ETag header for concurrency-controlled updates (`"W/<row_version>"`).
  - `Cache-Control`: Enforces `no-store, private` for all clinical endpoints.

---

## 2. API Endpoints Catalog

### 2.1 Master Data

- **`GET /api/master-data`**
  - **Auth Required:** No (Public reference data).
  - **Returns:** Active operating rooms, clinical specializations, departments, and payer types.

### 2.2 Incident Report Lifecycle

- **`GET /api/incidents`**
  - **Auth Required:** Yes (`TENAGA_KESEHATAN`, `KEPALA_RUANGAN`, `KOMITE_PMKP`, `ADMINISTRATOR`).
  - **Query Parameters:** `status` (optional filter).
  - **Scoping Rule:**
    - Non-drafts: Visible to all IBS staff (peer visibility).
    - Drafts: Strictly filtered to `created_by_user_id == current_user.id`.
    - Administrator: Clinical narrative stripped.
- **`POST /api/incidents`**
  - **Auth Required:** Yes (`TENAGA_KESEHATAN`, `KEPALA_RUANGAN`, `KOMITE_PMKP`). `ADMINISTRATOR` denied.
  - **Payload:** Minimum draft requirements: `reporter_name`, `reporter_role`, `incident_datetime`, `incident_type`.
  - **Result:** Creates persistent draft in D1 with `status = 'DRAFT'`, `row_version = 1`.
  - **Audit Event:** Emits `DRAFT_CREATED`.
- **`GET /api/incidents/:id`**
  - **Auth Required:** Yes.
  - **Authorization:** Drafts only viewable by `created_by`. Non-drafts viewable by IBS staff.
  - **Returns:** Incident report, investigation worksheet, and submission snapshot.
- **`PATCH /api/incidents/:id` / `PATCH /api/incidents/:id/draft`**
  - **Auth Required:** Yes.
  - **Authorization:** Only `created_by` can edit draft. Status must be `DRAFT` or `REVISION_REQUIRED`.
  - **Concurrency:** Enforces `If-Match` or `body.row_version`. Returns `412 Precondition Failed` on stale version.
  - **Result:** Updates draft fields, increments `row_version`.
- **`DELETE /api/incidents/:id`**
  - **Auth Required:** Yes.
  - **Authorization:** Only `created_by` can delete draft. Status must be `DRAFT`.
  - **Result:** Hard delete from D1. Zero retained audit event.
- **`POST /api/incidents/:id/submit`**
  - **Auth Required:** Yes.
  - **Authorization:** Only `created_by` can submit report. Status must be `DRAFT` or `REVISION_REQUIRED`.
  - **Validation:** Enforces 100% completion of all mandatory Bagian I & II Form fields.
  - **SLA Calculation:** Computes 48h deadline. If overdue, mandates non-empty `overdue_reason`.
  - **Report Number:** Allocates canonical sequential number `IKP/IBS/YYYYMM/XXXX` atomically.
  - **Snapshot:** Creates/updates `incident_submission_snapshots`.
  - **Audit Event:** Emits `REPORT_SUBMITTED`.
  - **Atomic Transaction:** All committed together via D1 batch.

### 2.3 Head of Room Review & Workflow Transitions

- **`POST /api/incidents/:id/receive`**
  - **Auth Required:** Yes (`KEPALA_RUANGAN` only).
  - **Precondition:** Status must be `SUBMITTED`.
  - **Result:** Transitions to `UNDER_REVIEW`. Records `received_by_user_id` and `received_at`.
- **`POST /api/incidents/:id/revision-required`**
  - **Auth Required:** Yes (`KEPALA_RUANGAN` only).
  - **Precondition:** Status must be `SUBMITTED` or `UNDER_REVIEW`.
  - **Payload:** `{ "revision_reason": "..." }` (optional).
  - **Result:** Transitions to `REVISION_REQUIRED`. Emits `REVISION_REQUIRED` audit event.
- **`POST /api/incidents/:id/assign-risk-grade`**
  - **Auth Required:** Yes (`KEPALA_RUANGAN` only).
  - **Precondition:** Status must be `UNDER_REVIEW`; current `If-Match: "W/<row_version>"` is mandatory.
  - **Payload:** `risk_grade` (`BIRU` | `HIJAU` | `KUNING` | `MERAH`), and if `KUNING`/`MERAH`: mandatory `high_risk_mitigation_notes`.
  - **Result:**
    - If `BIRU`/`HIJAU` -> remains `UNDER_REVIEW`; no `simple_investigations` row is created until the explicit start action.
    - If `KUNING`/`MERAH` -> `PMKP_REVIEW`.
- **`POST /api/incidents/:id/emergency-correction`**
  - **Auth Required:** Yes (Strictly `KEPALA_RUANGAN` only).
  - **Precondition:** Status must be `SUBMITTED` or `UNDER_REVIEW`. Forbidden in `SIMPLE_INVESTIGATION`, `PMKP_REVIEW`, or completed states.
  - **Payload:** `reason` (mandatory, 1–500 chars trimmed) + fields to update.
  - **Result:** Updates `incident_reports` AND `incident_submission_snapshots`. Emits `EMERGENCY_CORRECTION` audit event.

### 2.4 Simple Investigation (Form Page 3)

- **`POST /api/incidents/:id/investigation/start`**
  - **Auth Required:** Yes (`KEPALA_RUANGAN` IBS only).
  - **Precondition:** Status `UNDER_REVIEW`; stored grade must be `BIRU` or `HIJAU`; current `If-Match: "W/<row_version>"` is mandatory.
  - **Result:** Atomically transitions to `SIMPLE_INVESTIGATION` and creates the single `simple_investigations` row. No start audit event is emitted because the approved minimal audit model has no such event.
- **`POST /api/incidents/:id/investigation/skip`**
  - **Auth Required:** Yes (`KEPALA_RUANGAN` IBS only).
  - **Precondition:** Status `UNDER_REVIEW`; stored grade must be `BIRU` or `HIJAU`; current `If-Match: "W/<row_version>"` and `{ "confirmed": true }` are mandatory.
  - **Result:** Atomically transitions to terminal `COMPLETED_BY_UNIT` and emits only `REPORT_COMPLETED`. It does not create a Simple Investigation record.

- **`GET /api/incidents/:id/investigation`**
  - **Auth Required:** Yes (IBS staff).
  - **Returns:** Current `simple_investigations` record.
- **`PUT /api/incidents/:id/investigation`**
  - **Auth Required:** Yes (`KEPALA_RUANGAN` only).
  - **Precondition:** Status must be `SIMPLE_INVESTIGATION`.
  - **Payload:** `direct_cause`, `underlying_root_cause`, `investigation_start_date`, `investigation_end_date`, `recommendations`, `actions`.
  - **Result:** Overwrites single simple investigation record (no version history).
- **`POST /api/incidents/:id/investigation/complete`**
  - **Auth Required:** Yes (`KEPALA_RUANGAN` only).
  - **Precondition:** Status must be `SIMPLE_INVESTIGATION`; current `If-Match: "W/<row_version>"` is mandatory.
  - **Validation:** All Form page 3 fields must be complete. `end_date >= start_date`. Recommendations and actions arrays length >= 1.
  - **Result:** Sets `status = 'COMPLETED_BY_UNIT'`, `completed_by_user_id = user.id`. Emits `SIMPLE_INVESTIGATION_COMPLETED` and `REPORT_COMPLETED` audit events atomically. Terminal state.

### 2.5 PMKP Review & External RCA Handoff

- **`GET /api/incidents/:id/pmkp-review`**
  - **Auth Required:** Yes (IBS staff).
  - **Returns:** `{ pmkp_reviewed: boolean, pmkp_review_notes: string | null }`.
- **`PUT /api/incidents/:id/pmkp-review`**
  - **Auth Required:** Yes (`KOMITE_PMKP` only).
  - **Precondition:** Status must be `PMKP_REVIEW` and `pmkp_reviewed = 0`.
  - **Payload:** `{ pmkp_review_notes: "..." }`.
- **`POST /api/incidents/:id/pmkp-review/finalize`**
  - **Auth Required:** Yes (`KOMITE_PMKP` or `KEPALA_RUANGAN`).
  - **Precondition:** Status must be `PMKP_REVIEW`.
  - **Result:** Sets `pmkp_reviewed = 1`, `status = 'COMPLETED'`. Emits `REPORT_COMPLETED` audit event atomically. Terminal state.

### 2.6 Audit Trail

- **`GET /api/incidents/:id/audit`**
  - **Auth Required:** Yes (Users with incident read access).
  - **Returns:** Array of audit records (`eventType`, `actorName`, `actorRole`, `occurredAt`, `notes`, `requestId`). Old/new values and changed field lists are strictly omitted per workshop decision.
