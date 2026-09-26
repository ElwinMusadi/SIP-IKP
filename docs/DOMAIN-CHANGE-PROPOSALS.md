# Domain Change Proposals (Blueprint Rectification Register)

## 1. Governance Policy on Blueprint Integrity

**MANDATORY RULE:** In strict accordance with Phase 05 constraints, **NO MODIFICATIONS HAVE BEEN APPLIED TO `docs/AI-Product-Blueprint-*.md` OR `docs/Form IKP.pdf`**.

This document formally records all architectural, data, and clinical discrepancies identified between the baseline Product Blueprint and the canonical domain model. These proposed changes are submitted to the Product Owner and PMKP Committee for formal review and future document revision.

---

## 2. Register of Proposed Blueprint Changes

### DCP-01: Formally Rectify "Auth JWT" to "Server-Side Opaque Sessions in HttpOnly Cookies"

- **Proposed Change:** In Section 4.3 (Scope & Acceptance Criteria, line 144) and Section 6.3 (Arsitektur Teknis, line 225), update the literal phrase `"Auth JWT"` to `"Server-Side Opaque Session in HttpOnly Secure Cookies"`.
- **Reason:** Frontline operating theaters utilize shared PC terminals where clinicians rotate frequently. Pure stateless JWTs cannot reliably enforce the mandated 15-minute sliding idle timeout (`FR-01`), cannot execute immediate session revocation upon logout, and cannot immediately terminate sessions when an account is disabled or credentials are changed.
- **Source in Blueprint:** Section 4.3 (line 144) & Section 6.3 (line 225).
- **Impact:** Eliminates security vulnerability on shared workstations and aligns technical architecture with edge serverless D1 session management.
- **Affected ADR:** `ADR-004` (Authentication and Session Architecture).
- **Approval Required:** Product Owner, Hospital IT Lead, Information Security Officer.

---

### DCP-02: Formally Correct "Password Terenkripsi" to "Salted Adaptive Password Hashing"

- **Proposed Change:** In Section 5.1 (FR-01, line 98) and Section 3.1 (Modul 9, line 87), replace `"Password terenkripsi"` with `"Salted Adaptive Password Hashing (Argon2id / PBKDF2 >=600,000 iterasi)"`.
- **Reason:** Storing passwords using reversible encryption is an insecure cryptographic practice that exposes all staff credentials in plaintext if the database and encryption key are compromised. Passwords must strictly be stored using adaptive, memory-hard, one-way cryptographic hashes.
- **Source in Blueprint:** Section 5.1 (line 98) & Section 3.1 (line 87).
- **Impact:** Clarifies non-negotiable security engineering standard in product documentation.
- **Affected ADR:** `ADR-018` (Password Security and MFA).
- **Approval Required:** Hospital Information Security Officer, IT Lead.

---

### DCP-03: Change 1:1 Investigation & PMKP Tables to 1:N Versioned Revisions

- **Proposed Change:** In Section 6.2 (Data Dictionary, lines 214 & 217), remove the `Unique` constraint from `simple_investigations.incident_report_id` and `pmkp_evaluations.incident_report_id`, redefining them as 1:N versioned entities (`investigation_revisions` and `pmkp_review_cycles`).
- **Reason:** Blueprint Section 5.1 (`FR-05`) and Section 7.2 (Flow 3) explicitly state that PMKP may return incomplete investigations for revision repeatedly. A 1:1 unique constraint in SQLite/D1 forces subsequent revisions to overwrite prior findings, recommendations, and directives, destroying historical evidence and violating medicolegal auditability.
- **Source in Blueprint:** Section 6.2 (lines 214 & 217).
- **Impact:** Preserves complete revision and evaluation cycle history for clinical governance.
- **Affected ADR:** `ADR-006` (Incident Immutability, Addenda, and Revisions).
- **Approval Required:** Chair of PMKP Committee, Hospital Legal Counsel.

---

### DCP-04: Add Explicit `incident_addenda` Entity to Data Dictionary

- **Proposed Change:** In Section 6.2 (Data Dictionary, line 220), formally insert the entity definition for `incident_addenda (id, incident_report_id, author_user_id, content, reason, created_at, audit_record_id)`.
- **Reason:** Business Rule 04 (`BR-04`, line 111) and Modul 6 (line 82) mandate that clinical information arising post-submission must be appended via an official addendum. However, the Blueprint's data dictionary completely omitted this table.
- **Source in Blueprint:** Section 5.2 (line 111) & Section 3.1 (line 82).
- **Impact:** Aligns data dictionary with stated business rules.
- **Affected ADR:** `ADR-006` (Incident Immutability, Addenda, and Revisions).
- **Approval Required:** Product Owner, Head of IBS, PMKP Chair.

---

### DCP-05: Include NIP (`nip_nrp`) in Audit Table Definition

- **Proposed Change:** In Section 6.2 (Data Dictionary, line 218), add `actor_nip_nrp TEXT NOT NULL` to the schema of `report_audit_logs`.
- **Reason:** Business Rule 07 (`BR-07`, line 116) explicitly states: _"Rekam jejak digital (e-paraf log) wajib memuat: Nama Lengkap, NIP, Peran/Jabatan, dan Timestamp"_. The conceptual audit table definition in line 218 omitted NIP, creating an internal contradiction.
- **Source in Blueprint:** Section 5.2 (line 116) vs. Section 6.2 (line 218).
- **Impact:** Guarantees that electronic audit records satisfy the project's own attribution requirement.
- **Affected ADR:** `ADR-008` (Digital Attribution and E-Paraf).
- **Approval Required:** Hospital Legal Counsel, Medical Records Lead.

---

### DCP-06: Clarify PMKP Regrading Scope Regarding `BIRU`

- **Proposed Change:** In Section 5.1 (`FR-05`, line 102) and Section 6.2 (line 217), formally clarify whether PMKP is permitted to regrade an incident to `BIRU` (low risk). If allowed, update the text from `"(Hijau/Kuning/Merah)"` to `"(Biru/Hijau/Kuning/Merah)"`. If prohibited, document the clinical rationale.
- **Reason:** The physical form provides 4 bands, but the Blueprint's regrading clauses omit BIRU without explanation, creating ambiguity in database check constraints and UI dropdowns.
- **Source in Blueprint:** Section 5.1 (line 102) & Section 6.2 (line 217).
- **Impact:** Eliminates ambiguity in PMKP regrading check constraints.
- **Affected ADR:** `ADR-002` (Workflow State Machine) & `DDR-04`.
- **Approval Required:** Chair of PMKP Committee.

---

### DCP-07: Specify Conditional Validation for Non-Patient Safety Incidents (Staf K3RS)

- **Proposed Change:** In Section 5.1 (`FR-02`, line 99) and Section 6.2 (line 213), explicitly specify that Bagian I Patient Demographics (`patient_name`, `medical_record_number`, `patient_room`, `admission_datetime`) are conditional, and are omitted/nullable when `incident_target = 'STAF_K3RS'`.
- **Reason:** Staff occupational safety accidents (e.g., surgical needle-stick injuries) do not have a patient medical record or hospital admission datetime. Without this clarification, the system forces staff to enter dummy patient data to satisfy database constraints.
- **Source in Blueprint:** Section 3 (line 33) & Section 5.1 (line 99).
- **Impact:** Supports K3RS occupational safety reporting cleanly and realistically.
- **Affected ADR:** `DDR-11`.
- **Approval Required:** Head of K3RS, PMKP Chair.

---

### DCP-08: Reconcile Emergency MR Number Update with Permanent Lock

- **Proposed Change:** In Section 2.2 (line 65) and Section 5.2 (`BR-04`, line 111), formally define that temporary Emergency MR numbers are updated exclusively via a governed `correction_requests` audit flow rather than silent in-place overwriting of the submitted snapshot.
- **Reason:** Line 65 allows updating temporary MR numbers later, while line 111 permanently locks all submitted primary fields. A formal correction request entity reconciles both needs by preserving both the original emergency value and the permanent hospital number with full audit attribution.
- **Source in Blueprint:** Section 2.2 (line 65) vs. Section 5.2 (line 111).
- **Impact:** Preserves forensic integrity while accommodating emergency clinical admissions.
- **Affected ADR:** `ADR-006` (Incident Immutability, Addenda, and Revisions).
- **Approval Required:** Head of Medical Records, PMKP Chair.
