# Domain Gap Analysis: Form IKP vs. Product Blueprint vs. Candidate Domain Model

## 1. Document Scope and Status

This document presents a comprehensive field-by-field and architectural gap analysis comparing:

1. **Source Document 1:** Physical Form Baseline ("Form IKP.pdf" as documented in Blueprint Section 3).
2. **Source Document 2:** Product Specification ("AI-Product-Blueprint-Sistem-Informasi-IKP-IBS-RSUD-WZ-Johannes.md").
3. **Target Model:** Candidate Domain Data Model (`docs/CANONICAL-DOMAIN-MODEL.md` & `docs/FORM-I-KP-DATA-TRACEABILITY.md`).

**STATUS: PROVISIONAL GAP ANALYSIS — IDENTIFIED CONFLICTS ARE DOCUMENTED WITHOUT SILENT RESOLUTION.**

---

## 2. Identified Gap Categories

### GAP-01: Incident Subject Ambiguity (Patient vs. K3RS Staff)

- **Source Comparison:**
  - _Form IKP.pdf:_ Subjek Insiden can be `Pasien`, `Karyawan/Staf K3RS`, `Pengunjung`, `Pendamping/Keluarga`, or `Lain-lain`.
  - _Blueprint:_ Data dictionary (`incident_reports`) models all Bagian I fields (`patient_name`, `medical_record_number`, `patient_room`, `patient_age_category`, `admission_datetime`) as standard columns without conditional nullability rules.
  - _Candidate Model:_ Identifies that an occupational hazard incident (e.g., surgical nurse needle-stick injury or scalpel cut during a laparotomy) does not have patient demographics or a hospital admission time.
- **Conflict / Ambiguity:** If patient fields are marked `NOT NULL` in the database, staff safety incidents cannot be reported without entering dummy/fake patient records.
- **Classification:** `CONFLICTING & AMBIGUOUS FIELD REQUIREMENTS`
- **Impact on Schema:** Requires conditional validation in domain services and nullable patient columns in the database, with a database `CHECK ((incident_target != 'PASIEN') OR (patient_name IS NOT NULL AND medical_record_number IS NOT NULL))` constraint.
- **Governing Matrix ID:** `DM-022`
- **Required Stakeholder Decision:** Hospital PMKP and K3RS must explicitly approve the conditional field rules for staff vs. patient incidents.

---

### GAP-02: Permanent Immutability vs. Emergency Medical Record Correction

- **Source Comparison:**
  - _Form IKP.pdf:_ Static paper document where corrections are physically crossed out or annotated.
  - _Blueprint Line 65:_ Explicitly allows temporary emergency MR numbers (e.g., `EMERGENCY-20260926-01`) to be updated to official permanent MR numbers post-submission.
  - _Blueprint BR-04 (Line 111):_ Permanently locks all primary incident data post-submission and mandates that subsequent information must use an official addendum.
  - _Candidate Model:_ Reconciles this by introducing a formal `correction_requests` entity that preserves the original submitted MR and captures the before/after values, requester, approver, and timestamp without silently updating the submission snapshot.
- **Conflict:** Directly conflicting requirement within the Blueprint itself (Line 65 allows update; BR-04 forbids update).
- **Classification:** `CONFLICTING REQUIREMENT`
- **Impact on Schema:** Requires explicit separation between immutable submission snapshot and a governed correction workflow.
- **Governing Matrix ID:** `DM-012`
- **Required Stakeholder Decision:** Clinical governance must define who can request and approve an MR number correction.

---

### GAP-03: Repeated PMKP Revisions vs. 1:1 Conceptual Data Dictionary

- **Source Comparison:**
  - _Blueprint Line 67, 102, 184:_ PMKP can return incomplete investigations for revision repeatedly until deemed complete.
  - _Blueprint Data Dictionary Line 214 & 217:_ Defines `simple_investigations.incident_report_id` and `pmkp_evaluations.incident_report_id` as `FK Unique` (1:1 relationship with the incident).
  - _Candidate Model:_ Replaces the 1:1 relationship with 1:N versioned revisions (`investigation_revisions`) and 1:N review cycles (`pmkp_review_cycles`).
- **Conflict:** A 1:1 database constraint guarantees that resubmitting a revised investigation destroys historical findings, recommendations, and PMKP return directives from prior cycles.
- **Classification:** `STRUCTURAL DEFECT IN BLUEPRINT DATA DICTIONARY`
- **Impact on Schema:** Schema must use versioned child tables (`investigation_revisions` and `pmkp_review_cycles`) to preserve medicolegal audit trails.
- **Governing Matrix ID:** `DM-010`
- **Required Stakeholder Decision:** Confirm that versioned revision history is the accepted model (ADR-006).

---

### GAP-04: Absence of Addendum Entity in Blueprint

- **Source Comparison:**
  - _Blueprint BR-04 & Line 82:_ Mandates that medical information arising post-submit must be recorded through an official addendum history.
  - _Blueprint Data Dictionary (Line 210-220):_ Contains zero tables, fields, or relationships for addenda.
  - _Candidate Model:_ Introduces the candidate `incident_addenda` table.
- **Conflict:** Requirement exists in business rules but is completely missing from the Blueprint's data architecture.
- **Classification:** `MISSING ENTITY IN BLUEPRINT`
- **Impact on Schema:** Must add `incident_addenda` table linked to `incident_reports`.
- **Governing Matrix ID:** `DM-011`
- **Required Stakeholder Decision:** Governance must define who is authorized to create addenda (reporter, unit head, or PMKP).

---

### GAP-05: Regrading Band Asymmetry (Exclusion of BIRU)

- **Source Comparison:**
  - _Form IKP.pdf:_ Risk grading box has 4 bands: BIRU, HIJAU, KUNING, MERAH.
  - _Blueprint Line 102 & Line 217:_ Specifically limits PMKP regrading to `HIJAU, KUNING, MERAH`, completely omitting `BIRU`.
  - _Candidate Model:_ Enforces the Blueprint restriction while flagging the asymmetry.
- **Ambiguity:** It is clinically unclear whether PMKP is intentionally prohibited from downgrading an incident to BIRU (lowest risk), or whether this was an accidental omission in the Blueprint.
- **Classification:** `AMBIGUOUS CLINICAL POLICY`
- **Impact on Schema:** Check constraint on `regraded_risk_band` must be `CHECK (regraded_risk_band IN ('HIJAU', 'KUNING', 'MERAH'))` unless stakeholders explicitly add `BIRU`.
- **Governing Matrix ID:** `DM-007`
- **Required Stakeholder Decision:** Clinical governance must confirm whether PMKP is allowed to regrade an incident to BIRU.

---

### GAP-06: Corrective Action Realization and Effectiveness Monitoring

- **Source Comparison:**
  - _Form IKP.pdf:_ Contains columns for Action, Responsible Person, and Target Date.
  - _Blueprint Line 216:_ Models `action_text`, `responsible_person`, `target_date`, `order_index`.
  - _Candidate Model:_ Identifies that neither Form IKP nor Blueprint provides fields to track whether the action was actually executed, when it was completed, what evidence was verified, or whether it prevented recurrence.
- **Gap:** The system records action plans, but has no mechanism to close the loop on action execution.
- **Classification:** `POST-INVESTIGATION LIFECYCLE GAP`
- **Impact on Schema:** Deciding whether action execution tracking belongs in MVP or Post-MVP.
- **Governing Matrix ID:** `DM-023`
- **Required Stakeholder Decision:** PMKP must decide whether action tracking is strictly a plan (MVP) or an active task-tracking system.

---

### GAP-07: Attachment Scope and R2 Integration

- **Source Comparison:**
  - _Blueprint Line 219 & 226:_ Defines `incident_attachments` and presigned R2 URLs.
  - _Blueprint FR-01 s/d FR-07 & MVP Scope Line 144:_ Zero mention of attachments in Functional Requirements or explicit MVP scope list.
  - _Candidate Model:_ Classifies attachments as `CONDITIONAL` pending explicit stakeholder confirmation.
- **Gap:** Inconsistency between technical architecture sections and product functional requirement sections.
- **Classification:** `SCOPE INCONSISTENCY IN BLUEPRINT`
- **Impact on Schema:** Attachment tables must remain isolated candidates until approved (`ADR-010`).
- **Governing Matrix ID:** `DM-016`
- **Required Stakeholder Decision:** Product owner must confirm whether evidence file uploads are in MVP.

---

### GAP-08: Wet Signature Replacement vs. Missing NIP Snapshot in Audit Table

- **Source Comparison:**
  - _Blueprint BR-07 (Line 116):_ Digital verification record replaces wet signature and MUST record Nama Lengkap, NIP, Peran/Jabatan, and Timestamp.
  - _Blueprint Line 218 (`report_audit_logs`):_ Contains `e_signature_name`, `e_signature_role`, and `created_at`, but completely OMITS `nip_nrp`.
  - _Candidate Model:_ Explicitly captures `actor_nip` in the attribution snapshot.
- **Conflict:** Conceptual audit table violates the project's own Business Rule 07.
- **Classification:** `DATA ARCHITECTURE OMISSION`
- **Impact on Schema:** Attribution snapshot schema must include NIP/NRP.
- **Governing Matrix ID:** `DM-014`
- **Required Stakeholder Decision:** Legal/medical records must approve the digital attribution schema (`ADR-008`).

---

### GAP-09: Single-Unit Scope vs. Hospital-Wide PMKP Oversight

- **Source Comparison:**
  - _Blueprint Title & Section 1:_ "Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) Instalasi Bedah Sentral (IBS)".
  - _Blueprint Line 124:_ PMKP role accesses "seluruh laporan insiden RS, fokus IBS".
  - _Candidate Model:_ Employs unit relational IDs to support IBS-first deployment while allowing multi-unit expansion without schema redesign.
- **Conflict:** Unclear organizational boundary between unit-specific and hospital-wide data visibility.
- **Classification:** `SYSTEM BOUNDARY CONFLICT`
- **Impact on Schema:** All incidents and user role assignments must reference explicit `unit_id` keys rather than embedding static "IBS" strings.
- **Governing Matrix ID:** `DM-001`
- **Required Stakeholder Decision:** Hospital leadership must approve organizational scope (`ADR-001`).

---

## 3. Summary of Gaps

| Gap ID     | Area                       | Severity | Impact on Phase 05                       | Action Taken                                                       |
| ---------- | -------------------------- | -------- | ---------------------------------------- | ------------------------------------------------------------------ |
| **GAP-01** | Patient vs Staff Subject   | High     | Database nullability & validation checks | Documented conditionality in Traceability Matrix; marked `DM-022`  |
| **GAP-02** | Emergency MR Correction    | High     | Submission immutability boundary         | Modeled separate `correction_requests` aggregate; marked `DM-012`  |
| **GAP-03** | Investigation Revisions    | Critical | Historical data integrity                | Modeled versioned revisions (1:N); marked `DM-010`                 |
| **GAP-04** | Missing Addenda Table      | High     | Post-submit clinical history             | Added candidate `incident_addenda` entity; marked `DM-011`         |
| **GAP-05** | Regrading Band Asymmetry   | Medium   | Enum constraints in D1                   | Constrained to HIJAU, KUNING, MERAH per Blueprint; marked `DM-007` |
| **GAP-06** | Action Plan Realization    | Low      | Action table schema completeness         | Retained as plan fields only for MVP; marked `DM-023`              |
| **GAP-07** | Attachment Inclusion       | Medium   | R2 schema and binding requirements       | Isolated as `CONDITIONAL` candidate; marked `DM-016`               |
| **GAP-08** | Missing NIP in Audit Table | High     | Medicolegal attribution validity         | Added NIP snapshot to candidate audit model; marked `DM-014`       |
| **GAP-09** | IBS vs Hospital-Wide Scope | High     | Organizational keys and query predicates | Decoupled with foreign keys to `units`; marked `DM-001`            |
