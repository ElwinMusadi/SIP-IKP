# Canonical Audit and Digital Attribution Model

## 1. Document Scope and Governance Status

# STATUS: PROVISIONAL DOMAIN SPECIFICATION — PENDING STAKEHOLDER APPROVAL

This document defines the canonical audit trail model, event taxonomy, technical attribution structure, and integrity constraints for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**GOVERNANCE & LEGAL MANDATE:**

- Do **NOT** claim this audit model is "tamper-proof" or "legally immutable". Those claims require external cryptographic verification or hardware-backed WORM storage not yet approved (`ADR-007`).
- Do **NOT** claim this technical attribution is "legally equivalent to a wet signature" until formal hospital legal and medical record governance executes an official adoption policy (`ADR-008`).
- The model herein implements **Technical Attribution and Restricted Append-Only Application Audit Records**.

---

## 2. Canonical Audit Record Schema

```text
Table: audit_records
-----------------------------------------------------------------------------------------------------
Column Name              Type      Nullability  Constraint / Purpose
-----------------------------------------------------------------------------------------------------
id                       TEXT      NOT NULL     PRIMARY KEY (UUIDv7 string)
request_id               TEXT      NOT NULL     Edge correlation ID from X-Request-ID header
actor_user_id            TEXT      NOT NULL     FK -> users.id (authenticated operator)
actor_full_name          TEXT      NOT NULL     Historical snapshot of actor's full name at moment of action
actor_nip_nrp            TEXT      NOT NULL     Historical snapshot of actor's NIP/NRP (`BR-07`)
actor_role_code          TEXT      NOT NULL     Historical snapshot of actor's active role during action
actor_profession         TEXT      NOT NULL     Historical snapshot of actor's clinical profession
actor_unit_name          TEXT      NOT NULL     Historical snapshot of actor's primary assigned unit
event_type               TEXT      NOT NULL     Domain event taxonomy identifier (e.g. REPORT_SUBMITTED)
resource_type            TEXT      NOT NULL     Target aggregate type (e.g. INCIDENT_REPORT)
resource_id              TEXT      NOT NULL     Target aggregate primary key
action_verb              TEXT      NOT NULL     Command executed (e.g. SUBMIT, GRADE, REVISE, COMPLETE)
lifecycle_status_before  TEXT      NULL         Previous status (NULL on creation)
lifecycle_status_after   TEXT      NOT NULL     Resulting status post-command
occurred_at_utc          TEXT      NOT NULL     Authoritative ISO 8601 server timestamp (`YYYY-MM-DDTHH:MM:SS.sssZ`)
client_ip_hash           TEXT      NOT NULL     SHA-256 hash of client IP for anomaly detection (never raw IP)
outcome                  TEXT      NOT NULL     CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILED'))
structured_metadata      TEXT      NULL         Sanitized JSON payload (safe identifiers, field change names)
before_reference         TEXT      NULL         Identifier/version of state prior to mutation
after_reference          TEXT      NULL         Identifier/version of state resulting from mutation
-----------------------------------------------------------------------------------------------------
```

---

## 3. Strict Audit Integrity Constraints

1. **Restricted Application Append-Only (`ADR-007`):**
   - The database role/credentials used by Cloudflare Pages Functions must only possess `INSERT` and `SELECT` privileges on the `audit_records` table.
   - `UPDATE` and `DELETE` queries on `audit_records` are strictly forbidden and rejected by application repository logic.
2. **Atomic Transaction Coupling:**
   - Any state-changing command on an incident or investigation must commit its domain mutation and its corresponding `audit_records` entry in a **single atomic D1 transaction** (`db.batch()`). A domain state transition without an audit record is an invalid, rolled-back transaction.
3. **No Direct User Insertion:**
   - Clients cannot invoke an "insert audit log" API. Audit entries are produced exclusively by server-side domain command handlers.
4. **Historical Attribution Snapshotting (`BR-07`):**
   - Actor attributes (`actor_full_name`, `actor_nip_nrp`, `actor_role_code`, `actor_profession`, `actor_unit_name`) must be captured as immutable value snapshots at the exact moment of the action. They must never rely on runtime SQL joins against the `users` table, ensuring historical attribution remains intact if a user updates their profile, changes roles, or is deactivated.

---

## 4. Technical Attribution & Digital "E-Paraf" Specification

In accordance with Business Rule 07 (`BR-07`, `docs/AI-Product-Blueprint-*.md:116`) and `ADR-008`:

### What is Technically Implemented:

- **Authenticated Identity Verification:** The system verifies that the actor holds an active, unrevoked session cookie authenticated via username/NIP and password.
- **Explicit Action Intent:** The actor executes an explicit confirmation command (e.g., clicking "Kirim Laporan Resmi", "Sahkan Investigasi Sederhana", or "Tutup Kasus Resmi" within a confirmation modal dialog).
- **Server-Authoritative Stempel:** The server binds its authoritative UTC timestamp, the Request ID, and the actor's immutable snapshot to the record.
- **PDF Printout Attribution:** The formal accreditation print preview (`Screen 07: /insiden/:id/cetak`) prints this structured attribution block inside the signature boxes:
  ```text
  [TERVERIFIKASI SISTEM ELEKTRONIK]
  Nama: Ns. Maria G. Klau, S.Kep
  NIP: 198501152010011002
  Peran: Tenaga Kesehatan (Perawat Bedah)
  Unit: Instalasi Bedah Sentral
  Waktu: 2026-09-26 14:32:10 WITA
  ID Jejak: req_01923456789abcdef
  ```

### What is NOT Claimed:

- No claim of statutory electronic signature certificate compliance (e.g., Balai Sertifikasi Elektronik / BSrE / Kominfo certification).
- No claim that digital attribution satisfies external legal evidentiary requirements unless formally approved by RSUD Prof. Dr. W. Z. Johannes legal counsel.

---

## 5. Domain Audit Event Taxonomy

| Event Type Code             | Emitting Domain Command  | Triggering Actor     | Resource Captured         | Critical Attribution Fields                          |
| --------------------------- | ------------------------ | -------------------- | ------------------------- | ---------------------------------------------------- |
| `DRAFT_CREATED`             | `CREATE_DRAFT`           | `TENAGA_KESEHATAN`   | `incident_reports`        | Creator ID, Unit ID, Timestamp, Request ID           |
| `REPORT_SUBMITTED`          | `SUBMIT_REPORT`          | `TENAGA_KESEHATAN`   | `incident_reports`        | Full Snapshot (`BR-07`), SLA Deadline, Overdue flag  |
| `REPORT_RECEIVED`           | `RECEIVE_REPORT`         | `KEPALA_RUANGAN`     | `incident_reports`        | Verifier Snapshot, Received Timestamp                |
| `RISK_GRADED_LOW`           | `ASSIGN_LOW_RISK_GRADE`  | `KEPALA_RUANGAN`     | `risk_decisions`          | Grader Snapshot, Assigned Band (`BIRU`/`HIJAU`)      |
| `RISK_GRADED_HIGH`          | `ASSIGN_HIGH_RISK_GRADE` | `KEPALA_RUANGAN`     | `risk_decisions`          | Grader Snapshot, Band (`KUNING`/`MERAH`), Mitigation |
| `INVESTIGATION_SUBMITTED`   | `SUBMIT_INVESTIGATION`   | `KEPALA_RUANGAN`     | `investigation_revisions` | Approver Snapshot, Date Range, Recommendations Count |
| `PMKP_REVIEW_OPENED`        | `OPEN_PMKP_REVIEW`       | `KOMITE_PMKP`        | `pmkp_review_cycles`      | Reviewer Snapshot, Started Timestamp                 |
| `REVISION_REQUESTED`        | `REQUEST_REVISION`       | `KOMITE_PMKP`        | `pmkp_review_cycles`      | Reviewer Snapshot, Directives text                   |
| `INVESTIGATION_RESUBMITTED` | `RESUBMIT_INVESTIGATION` | `KEPALA_RUANGAN`     | `investigation_revisions` | Approver Snapshot, Incremented Revision Number       |
| `INCIDENT_REGRADED`         | `REGRADE_INCIDENT`       | `KOMITE_PMKP`        | `risk_decisions`          | Regrader Snapshot, Prior Grade, New Grade, Reason    |
| `REPORT_COMPLETED`          | `COMPLETE_REPORT`        | `KOMITE_PMKP`        | `incident_reports`        | Completing Reviewer Snapshot, Completion Timestamp   |
| `ADDENDUM_APPENDED`         | `CREATE_ADDENDUM`        | Authorized Staff     | `incident_addenda`        | Author Snapshot, Addendum Sequence, Reason           |
| `CORRECTION_APPLIED`        | `APPLY_CORRECTION`       | Authorized Authority | `correction_requests`     | Requester, Approver, Before/After MR number          |
| `REPORT_EXPORTED_CSV`       | `EXPORT_CSV`             | `KOMITE_PMKP`        | `incident_reports`        | Exporter Snapshot, Filter Criteria, Row Count        |
| `REPORT_PRINTED_PDF`        | `PRINT_PDF`              | Authorized Clinical  | `incident_reports`        | Viewer Snapshot, Timestamp, Output Mode              |
