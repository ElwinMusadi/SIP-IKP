# Production D1 Schema Readiness Specification

## 1. Scope and Architectural Readiness Status

# STATUS: DESIGN SPECIFICATION — PRODUCTION MIGRATIONS PROHIBITED IN PHASE 05

This document establishes the physical database design principles, D1 constraints, transactional boundaries, optimistic concurrency mechanisms, and idempotency contracts for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**HARD CONSTRAINT REMINDER:** This is an engineering readiness document. **ZERO PRODUCTION D1 MIGRATIONS ARE CREATED IN THIS PHASE.** Authoritative SQL migrations will only be drafted in Phase 06 after all blocking stakeholder decisions in `PRODUCTION-SCHEMA-READINESS-MATRIX.md` are formally resolved.

---

## 2. Cloudflare D1 & SQLite Physical Design Principles

### 2.1 SQLite Engine Features & D1 Limitations

- **SQLite Engine:** Cloudflare D1 operates on an optimized SQLite foundation replicated across the Cloudflare edge network.
- **Strict Tables (`STRICT`):** All tables must be defined with SQLite `STRICT` mode. This enforces column data types (`TEXT`, `INTEGER`, `REAL`, `BLOB`) at the storage engine level, preventing silent type coercion.
- **Foreign Key Enforcement:** Foreign keys must be explicitly enforced in all database connections via `PRAGMA foreign_keys = ON;`.
- **Write Concurrency:** D1 writes are coordinated through a single-primary consensus protocol at the database region. Write transactions must be concise and avoid unnecessary locks. Read queries are distributed globally across edge read replicas.

### 2.2 Primary Key Strategy

- **Format:** Application-generated **UUIDv7 strings** (`TEXT PRIMARY KEY`).
- **Rationale:** UUIDv7 embeds a 48-bit millisecond timestamp in the most significant bits, ensuring chronological sorting, zero index fragmentation on B-Tree insertions, and global uniqueness without requiring database-level auto-increment coordination across distributed edge workers.
- **Display Identifiers:** Human-readable report numbers (`report_number`: `IKP/IBS/YYYYMM/XXXX`) are stored as separate indexed columns with unique constraints, allocated atomically via sequence counters.

### 2.3 Timestamp & Datetime Storage

- **Canonical Storage:** All timestamps representing an exact instant in time must be stored as **UTC ISO 8601 strings** with millisecond precision and explicit `Z` suffix (`YYYY-MM-DDTHH:MM:SS.sssZ`, `TEXT NOT NULL`).
- **Date-Only Fields:** Fields representing calendar dates without time (e.g. `patient_birth_date`, `investigation_start_date`, `investigation_end_date`, `target_date`) must be stored as **ISO date strings** (`YYYY-MM-DD`, `TEXT`). They must never be converted to UTC timestamps to prevent calendar date shifts across timezones.
- **Display Formatting:** Presentation layers convert UTC instants to hospital time (`Asia/Makassar`, WITA, UTC+08:00) during rendering.

### 2.4 Nullability and Check Constraints

- **Default Disposition:** Columns are `NOT NULL` by default.
- **Conditional Nullability:** Nullable columns are permitted only when representing business conditional rules (e.g. `patient_name` is null when `incident_target = 'STAF_K3RS'`; `high_risk_mitigation_notes` is null when `risk_grade IN ('BIRU', 'HIJAU')`).
- **Domain CHECK Constraints:** All enumerated fields must have explicit database-level `CHECK` constraints to reject invalid machine strings:
  ```sql
  CHECK (incident_type IN ('KNC', 'KTC', 'KTD', 'SENTINEL'))
  CHECK (risk_grade IN ('BIRU', 'HIJAU', 'KUNING', 'MERAH'))
  CHECK (lifecycle_status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SIMPLE_INVESTIGATION', 'ESCALATED_TO_PMKP', 'SUBMITTED_TO_PMKP', 'PMKP_REVIEW', 'REVISION_REQUIRED', 'COMPLETED', 'COMPLETED_BY_UNIT'))
  CHECK (is_overdue_sla IN (0, 1))
  CHECK (investigation_end_date >= investigation_start_date)
  ```

### 2.5 Soft Deletion & Account Deactivation

- **No Universal Soft Deletion:** The project explicitly rejects adding a generic `is_deleted` or `deleted_at` column across all tables. Clinical submission snapshots, audit records, and risk decisions cannot be deleted.
- **Deactivation for Identity & Master Data:** Entities referenced by historical incident records (such as `users`, `units`, `master_operating_rooms`) employ an active flag (`is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))`) and `deactivated_at_utc`. Deactivated entities are hidden from active selection dropdowns but preserved to guarantee foreign key integrity for historical audits.

---

## 3. D1 Transaction Boundaries (`db.batch()`)

Because Cloudflare D1 executes edge transactions using batch arrays, composite domain mutations must be committed atomically.

### 3.1 Command Transaction: `SUBMIT_REPORT`

```text
BEGIN TRANSACTION (Atomic db.batch):
  1. Verify optimistic concurrency: check incident_reports.row_version == expected_version.
  2. Increment report number sequence counter for current YYYYMM.
  3. Generate canonical report_number string ("IKP/IBS/YYYYMM/XXXX").
  4. Update incident_reports: set lifecycle_status = 'SUBMITTED', report_number, row_version = row_version + 1.
  5. Insert incident_submission_snapshots: capture full clinical facts, SLA calculations, and reporter attribution.
  6. Insert audit_records: capture REPORT_SUBMITTED domain event with immutable actor snapshot.
  7. Consume idempotency_records: store request hash and reference to created snapshot.
COMMIT;
```

### 3.2 Command Transaction: `ASSIGN_RISK_GRADE` (Kepala Ruangan)

```text
BEGIN TRANSACTION (Atomic db.batch):
  1. Verify incident_reports.lifecycle_status == 'UNDER_REVIEW' and row_version == expected_version.
  2. Insert risk_decisions: record decision_type = 'INITIAL_GRADING', risk_grade, mitigation notes if Kuning/Merah.
  3. Update incident_reports:
       - If BIRU / HIJAU: set lifecycle_status = 'SIMPLE_INVESTIGATION', row_version = row_version + 1.
       - If KUNING / MERAH: set lifecycle_status = 'ESCALATED_TO_PMKP', row_version = row_version + 1.
  4. If BIRU / HIJAU: create working draft in investigation_revisions (revision_number = 1, is_submitted = 0).
  5. Insert audit_records: capture RISK_GRADED_LOW or RISK_GRADED_HIGH_ESCALATED event.
COMMIT;
```

### 3.3 Command Transaction: `SUBMIT_INVESTIGATION` (Kepala Ruangan)

```text
BEGIN TRANSACTION (Atomic db.batch):
  1. Verify incident_reports.lifecycle_status IN ('SIMPLE_INVESTIGATION', 'REVISION_REQUIRED').
  2. Verify investigation_revisions: investigation_end_date >= investigation_start_date.
  3. Verify child recommendations and actions: count >= 1 for each.
  4. Update investigation_revisions: set is_submitted = 1, approved_by_user_id, approved_at_utc.
  5. Update incident_reports: set lifecycle_status = 'SUBMITTED_TO_PMKP', row_version = row_version + 1.
  6. Insert audit_records: capture INVESTIGATION_SUBMITTED or INVESTIGATION_RESUBMITTED event.
COMMIT;
```

### 3.4 Command Transaction: `COMPLETE_REPORT` (Komite PMKP)

```text
BEGIN TRANSACTION (Atomic db.batch):
  1. Verify incident_reports.lifecycle_status == 'PMKP_REVIEW' and row_version == expected_version.
  2. Verify pmkp_review_cycles: is_investigation_complete == 'YA' AND is_further_investigation_needed == 'TIDAK'.
  3. Update pmkp_review_cycles: set evaluated_by_user_id, completed_at_utc.
  4. Update incident_reports: set lifecycle_status = 'COMPLETED', row_version = row_version + 1.
  5. Insert audit_records: capture REPORT_COMPLETED event with PMKP actor attribution snapshot.
COMMIT;
```

---

## 4. Optimistic Concurrency Control Specification

To prevent race conditions when two clinical supervisors simultaneously inspect or edit a record on shared terminals:

- Every mutating command against `IncidentReport` or working `InvestigationRevision` requires an `If-Match` HTTP header matching the resource's current ETag (`"W/<row_version>"`).
- **Missing Header:** If mutating request lacks `If-Match`, server returns `HTTP 428 Precondition Required`.
- **Stale Version:** If database query finds `current_row_version != expected_row_version`, transaction is aborted immediately and server returns `HTTP 412 Precondition Failed` (or `HTTP 409 Conflict` for domain state conflicts).
- **Successful Mutation:** Increments `row_version = row_version + 1` and returns fresh `ETag: "W/<new_row_version>"` header in response.

---

## 5. Idempotency Specification

Consequential commands (`SUBMIT_REPORT`, `ASSIGN_RISK_GRADE`, `SUBMIT_INVESTIGATION`, `COMPLETE_REPORT`, `APPLY_CORRECTION`) require an `Idempotency-Key` header (UUID string) to protect against network drops and double-clicks:

- Table: `idempotency_records (key TEXT PRIMARY KEY, actor_user_id TEXT, command_name TEXT, request_hash TEXT, response_code INTEGER, response_body TEXT, created_at_utc TEXT, expires_at_utc TEXT)`.
- **First Execution:** Inserts record with status `IN_PROGRESS` or commits atomic response alongside domain transaction.
- **Replay with Identical Payload:** Returns cached response with header `X-Idempotent-Replay: true`.
- **Replay with Mismatched Payload:** Rejects immediately with `HTTP 409 Conflict` (`IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`).
- **TTL:** Idempotency keys expire after 24 hours.

---

## 6. Migration and Schema Delivery Strategy (Phase 06 Prerequisites)

Authoritative D1 migrations must follow strict forward-only engineering:

1. Migration files placed in `database/migrations/` using 4-digit sequential prefix:
   - `0001_identity_and_organizations.sql`
   - `0002_incident_core_and_snapshots.sql`
   - `0003_investigations_and_pmkp.sql`
   - `0004_audit_and_governance.sql`
2. No migration may be edited once deployed to preview or production environments.
3. Every migration must be tested against both an empty D1 database and an upgraded prior-version database using the local D1 test harness (`test-support/d1/harness.ts`).
