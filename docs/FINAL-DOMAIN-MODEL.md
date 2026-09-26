# Final Domain Model Specification (Phase 07 Reconciled)

## 1. Scope and Architectural Alignment

This document defines the definitive domain data model and entity specifications for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

This specification translates the **Decision Workshop (#1–#188)** business policies into a unified, lean, production-ready schema design for Cloudflare D1.

---

## 2. Definitive Aggregate Structure

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        IDENTITY & AUTHENTICATION                       │
│                                                                        │
│   ┌──────────────────────────┐           ┌─────────────────────────┐   │
│   │          users           │◄──────────┤        sessions         │   │
│   │ - id (UUIDv7)            │           │ - id (UUIDv7)           │   │
│   │ - username / NIP         │           │ - token_hash (SHA-256)  │   │
│   │ - password_hash (PBKDF2) │           │ - csrf_token            │   │
│   │ - role (TENAGA_KESEHATAN,│           │ - issued_at / expires_at│   │
│   │   KEPALA_RUANGAN, PMKP,  │           │ - last_seen_at (15m idle│   │
│   │   ADMINISTRATOR)         │           │ - revoked_at            │   │
│   │ - unit_id ("IBS")        │           └─────────────────────────┘   │
│   │ - is_active (0/1)        │                                         │
│   └─────────────┬────────────┘                                         │
└─────────────────┼──────────────────────────────────────────────────────┘
                  │
                  │ created_by_user_id / actor_user_id
                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         INCIDENT DOMAIN ROOT                           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                        incident_reports                        │   │
│   │ - id: UUIDv7 string (PK)                                       │   │
│   │ - report_number: "IKP/IBS/YYYYMM/XXXX" (UNIQUE)                │   │
│   │ - status: DRAFT | SUBMITTED | REVISION_REQUIRED | UNDER_REVIEW │   │
│   │           | SIMPLE_INVESTIGATION | PMKP_REVIEW                 │   │
│   │           | COMPLETED_BY_UNIT | COMPLETED                      │   │
│   │ - created_by_user_id (FK -> users)                             │   │
│   │ - reporter_name, reporter_role                                 │   │
│   │ - owning_unit_id ("IBS")                                       │   │
│   │                                                                │   │
│   │ [Bagian I: Data Pasien]                                        │   │
│   │ - patient_name, medical_record_number, patient_room            │   │
│   │ - patient_age_category, patient_gender, patient_payer_type     │   │
│   │ - admission_datetime                                           │   │
│   │                                                                │   │
│   │ [Bagian II: Rincian Kejadian & Kronologi]                      │   │
│   │ - incident_datetime, incident_timezone ("Asia/Makassar")       │   │
│   │ - incident_title, chronology (plain-text max 10k chars)        │   │
│   │ - incident_type (KNC, KTC, KTD, SENTINEL)                      │   │
│   │ - initial_reporter_category, initial_reporter_detail           │   │
│   │ - incident_target (PASIEN, KARYAWAN_NAKES, PENGUNJUNG,         │   │
│   │                    PENDAMPING, KELUARGA_PASIEN, LAIN_LAIN)     │   │
│   │ - incident_target_other (free text when LAIN_LAIN)             │   │
│   │ - patient_care_type, incident_location, clinical_specialization│   │
│   │ - causing_unit, patient_impact, immediate_action_and_result    │   │
│   │ - action_taken_by, similar_incident_occurred                   │   │
│   │                                                                │   │
│   │ [SLA Tracking & Risk Grading]                                  │   │
│   │ - sla_deadline_utc, is_overdue_sla (0/1), overdue_reason       │   │
│   │ - risk_grade (BIRU, HIJAU, KUNING, MERAH), risk_graded_at      │   │
│   │ - high_risk_mitigation_notes (mandatory for Kuning/Merah)      │   │
│   │                                                                │   │
│   │ [Workflow & PMKP Data]                                         │   │
│   │ - received_by_user_id, received_at                             │   │
│   │ - revision_reason                                              │   │
│   │ - pmkp_reviewed (0/1), pmkp_review_notes                       │   │
│   │ - row_version (optimistic concurrency integer)                 │   │
│   │ - created_at, updated_at, submitted_at, completed_at           │   │
│   └───────────────────────┬──────────────────────────┬─────────────┘   │
│                           │                          │                 │
│         1:1 Single Record │                          │ 1:N Audit       │
│         (Overwritten on   │                          │ Events          │
│          re-investigation)▼                          ▼                 │
│   ┌───────────────────────────────┐     ┌──────────────────────────┐   │
│   │     simple_investigations     │     │      audit_records       │   │
│   │ - id: UUIDv7 (PK)             │     │ - id: UUIDv7 (PK)        │   │
│   │ - incident_id: FK UNIQUE      │     │ - incident_id: FK        │   │
│   │ - direct_cause (TEXT)         │     │ - event_type (CHECK:     │   │
│   │ - underlying_root_cause (TEXT)│     │     DRAFT_CREATED,       │   │
│   │ - investigation_start_date    │     │     REPORT_SUBMITTED,    │   │
│   │ - investigation_end_date      │     │     REVISION_REQUIRED,   │   │
│   │ - recommendations (JSON array)│     │     SIMPLE_INVESTIGATION_│   │
│   │ - actions (JSON array)        │     │       COMPLETED,         │   │
│   │ - completed_by_user_id (FK)   │     │     REPORT_COMPLETED,    │   │
│   │ - completed_at                │     │     EMERGENCY_CORRECTION)│   │
│   │ - created_at, updated_at      │     │ - actor_user_id (FK)     │   │
│   └───────────────────────────────┘     │ - actor_name, actor_role │   │
│                                         │ - occurred_at_utc        │   │
│                                         │ - notes, request_id      │   │
│                                         └──────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Entity Definitions

### 3.1 Entity: `users`

- **Purpose:** Staff identity, credentials, active status, and primary role.
- **Columns:**
  - `id` (TEXT, PK, UUIDv7)
  - `username` (TEXT, NOT NULL, UNIQUE): NIP or official staff login identifier.
  - `password_hash` (TEXT, NOT NULL): Formatted PBKDF2-HMAC-SHA-256 or Argon2id hash.
  - `full_name` (TEXT, NOT NULL): Clinical staff display name.
  - `role` (TEXT, NOT NULL, CHECK in `'TENAGA_KESEHATAN'`, `'KEPALA_RUANGAN'`, `'KOMITE_PMKP'`, `'ADMINISTRATOR'`).
  - `profession` (TEXT, NOT NULL): e.g. `'Dokter Operator'`, `'Perawat Bedah'`, `'Penata Anestesi'`.
  - `unit_id` (TEXT, NOT NULL, DEFAULT `'IBS'`): Unit assignment.
  - `is_active` (INTEGER, NOT NULL, DEFAULT 1, CHECK in `(0, 1)`): Deactivation flag.
  - `created_at`, `updated_at` (TEXT, NOT NULL, UTC ISO 8601).

### 3.2 Entity: `sessions`

- **Purpose:** Server-side opaque session tracking with 15-minute sliding idle timeout and anti-CSRF binding.
- **Columns:**
  - `id` (TEXT, PK, UUIDv7)
  - `user_id` (TEXT, NOT NULL, FK -> `users.id` ON DELETE CASCADE)
  - `token_hash` (TEXT, NOT NULL, UNIQUE): SHA-256 digest of the cookie token.
  - `csrf_token` (TEXT, NOT NULL): Synchronizer token verified on mutating HTTP requests.
  - `issued_at` (TEXT, NOT NULL, UTC ISO 8601)
  - `last_seen_at` (TEXT, NOT NULL, UTC ISO 8601): Updated on authenticated requests.
  - `expires_at` (TEXT, NOT NULL, UTC ISO 8601): Absolute lifetime ceiling (e.g. 12 hours).
  - `revoked_at` (TEXT, NULL, UTC ISO 8601): Set on logout or forced revocation.
  - `revocation_reason` (TEXT, NULL)

### 3.3 Entity: `incident_reports`

- **Purpose:** Core incident aggregate root representing Parts I & II of Form IKP and workflow progress.
- **Columns:**
  - `id` (TEXT, PK, UUIDv7)
  - `report_number` (TEXT, NULL, UNIQUE): Allocated on submission (`IKP/IBS/YYYYMM/XXXX`).
  - `status` (TEXT, NOT NULL, CHECK in `'DRAFT'`, `'SUBMITTED'`, `'REVISION_REQUIRED'`, `'UNDER_REVIEW'`, `'SIMPLE_INVESTIGATION'`, `'PMKP_REVIEW'`, `'COMPLETED_BY_UNIT'`, `'COMPLETED'`).
  - `created_by_user_id` (TEXT, NOT NULL, FK -> `users.id`)
  - `reporter_name` (TEXT, NOT NULL)
  - `reporter_role` (TEXT, NOT NULL)
  - `owning_unit_id` (TEXT, NOT NULL, DEFAULT `'IBS'`)
  - **Bagian I (Patient):**
    - `patient_name` (TEXT, NULL in draft, NOT NULL on submit)
    - `medical_record_number` (TEXT, NULL in draft, NOT NULL on submit)
    - `patient_room` (TEXT, NULL in draft, NOT NULL on submit)
    - `patient_age_category` (TEXT, NULL in draft, NOT NULL on submit)
    - `patient_gender` (TEXT, NULL in draft, NOT NULL on submit, CHECK in `'LAKI_LAKI'`, `'PEREMPUAN'`)
    - `patient_payer_type` (TEXT, NULL in draft, NOT NULL on submit)
    - `admission_datetime` (TEXT, NULL in draft, NOT NULL on submit)
  - **Bagian II (Incident Facts & Chronology):**
    - `incident_datetime` (TEXT, NOT NULL)
    - `incident_timezone` (TEXT, NOT NULL, DEFAULT `'Asia/Makassar'`)
    - `incident_title` (TEXT, NULL in draft, NOT NULL on submit)
    - `chronology` (TEXT, NULL in draft, NOT NULL on submit, max 10,000 chars)
    - `incident_type` (TEXT, NOT NULL, CHECK in `'KNC'`, `'KTC'`, `'KTD'`, `'SENTINEL'`)
    - `initial_reporter_category` (TEXT, NULL in draft, NOT NULL on submit)
    - `initial_reporter_detail` (TEXT, NULL)
    - `incident_target` (TEXT, NOT NULL, CHECK in `'PASIEN'`, `'KARYAWAN_NAKES'`, `'PENGUNJUNG'`, `'PENDAMPING'`, `'KELUARGA_PASIEN'`, `'LAIN_LAIN'`)
    - `incident_target_other` (TEXT, NULL)
    - `patient_care_type` (TEXT, NULL)
    - `incident_location` (TEXT, NULL in draft, NOT NULL on submit)
    - `clinical_specialization` (TEXT, NULL in draft, NOT NULL on submit)
    - `causing_unit` (TEXT, NULL in draft, NOT NULL on submit)
    - `patient_impact` (TEXT, NULL in draft, NOT NULL on submit)
    - `immediate_action_and_result` (TEXT, NULL in draft, NOT NULL on submit)
    - `action_taken_by` (TEXT, NULL in draft, NOT NULL on submit)
    - `similar_incident_occurred` (TEXT, NULL in draft, NOT NULL on submit)
  - **SLA & Tracking:**
    - `sla_deadline_utc` (TEXT, NULL in draft, NOT NULL on submit)
    - `is_overdue_sla` (INTEGER, NOT NULL, DEFAULT 0, CHECK in `(0, 1)`)
    - `overdue_reason` (TEXT, NULL)
  - **Risk Decision:**
    - `risk_grade` (TEXT, NULL, CHECK in `'BIRU'`, `'HIJAU'`, `'KUNING'`, `'MERAH'`)
    - `risk_graded_at` (TEXT, NULL)
    - `high_risk_mitigation_notes` (TEXT, NULL)
  - **Workflow & Operational Metadata:**
    - `received_by_user_id` (TEXT, NULL, FK -> `users.id`)
    - `received_at` (TEXT, NULL)
    - `revision_reason` (TEXT, NULL)
    - `pmkp_reviewed` (INTEGER, NOT NULL, DEFAULT 0, CHECK in `(0, 1)`)
    - `pmkp_review_notes` (TEXT, NULL)
    - `row_version` (INTEGER, NOT NULL, DEFAULT 1)
    - `created_at`, `updated_at`, `submitted_at`, `completed_at` (TEXT, UTC ISO 8601)

### 3.4 Entity: `simple_investigations`

- **Purpose:** Single, authoritative Simple Investigation record (Form IKP page 3) for `BIRU` and `HIJAU` incidents.
- **Kardinalitas:** 1:1 with `incident_reports` (`incident_id` UNIQUE).
- **Revision Handling:** Overwrites the same record upon re-investigation. No version history as domain object.
- **Columns:**
  - `id` (TEXT, PK, UUIDv7)
  - `incident_id` (TEXT, NOT NULL, UNIQUE, FK -> `incident_reports.id` ON DELETE CASCADE)
  - `direct_cause` (TEXT, NULL during edit, NOT NULL on completion)
  - `underlying_root_cause` (TEXT, NULL during edit, NOT NULL on completion)
  - `investigation_start_date` (TEXT, NULL during edit, NOT NULL on completion, `YYYY-MM-DD`)
  - `investigation_end_date` (TEXT, NULL during edit, NOT NULL on completion, `YYYY-MM-DD`, CHECK `end >= start`)
  - `recommendations` (TEXT, NOT NULL, DEFAULT `'[]'`): JSON array of recommendation objects `[{ "text": "...", "responsible": "...", "target_date": "YYYY-MM-DD" }]`.
  - `actions` (TEXT, NOT NULL, DEFAULT `'[]'`): JSON array of corrective action objects `[{ "text": "...", "responsible": "...", "target_date": "YYYY-MM-DD" }]`.
  - `completed_by_user_id` (TEXT, NULL, FK -> `users.id`): Captured when Kepala Ruangan completes investigation.
  - `completed_at` (TEXT, NULL)
  - `created_at`, `updated_at` (TEXT, NOT NULL, UTC ISO 8601)

### 3.5 Entity: `audit_records`

- **Purpose:** Append-only clinical governance audit log for tracking consequential report lifecycle events.
- **Columns:**
  - `id` (TEXT, PK, UUIDv7)
  - `incident_id` (TEXT, NOT NULL, FK -> `incident_reports.id` ON DELETE CASCADE)
  - `event_type` (TEXT, NOT NULL, CHECK in:
    - `'DRAFT_CREATED'`,
    - `'REPORT_SUBMITTED'`,
    - `'REVISION_REQUIRED'`,
    - `'SIMPLE_INVESTIGATION_COMPLETED'`,
    - `'REPORT_COMPLETED'`,
    - `'EMERGENCY_CORRECTION'`)
  - `actor_user_id` (TEXT, NOT NULL, FK -> `users.id`)
  - `actor_name` (TEXT, NOT NULL): Immutable snapshot of actor's name.
  - `actor_role` (TEXT, NOT NULL): Immutable snapshot of actor's role.
  - `occurred_at_utc` (TEXT, NOT NULL, UTC ISO 8601)
  - `notes` (TEXT, NULL): Mandatory for `EMERGENCY_CORRECTION` (1–500 chars), optional for `REVISION_REQUIRED`.
  - `request_id` (TEXT, NOT NULL)

### 3.6 Master Data Tables

- `master_operating_rooms` (`id`, `name`, `code`, `is_active`, `created_at`)
- `master_specializations` (`id`, `name`, `code`, `is_active`, `created_at`)
- `master_departments` (`id`, `name`, `code`, `is_active`, `created_at`)
- `master_payer_types` (`id`, `name`, `code`, `is_active`, `created_at`)
