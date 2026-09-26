# Domain Decision Register

## 1. Document Scope and Purpose

This register documents all unresolved domain, workflow, governance, and data architecture decisions for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

It serves as the formal **governance-to-implementation bridge**: each row specifies the exact decision required, the available options, the downstream architectural impacts, and the designated stakeholder authority whose sign-off is required before Phase 06 production schema implementation can begin.

---

## 2. Unresolved Domain Decisions

### DDR-01: Organizational Scope & Multi-Unit Architecture

- **Governing Matrix ID:** `DM-001`
- **Related ADR:** `ADR-001`
- **Source Requirement:** Blueprint Title & Section 1 vs. Blueprint Line 124 (PMKP access).
- **Current Status:** `STAKEHOLDER DECISION REQUIRED`
- **Available Options:**
  - _Option A:_ Strict IBS-only application (hardcoded IBS references).
  - _Option B:_ Immediate hospital-wide deployment (all wards onboarded from day 1).
  - _Option C:_ IBS-first deployment with multi-unit capable relational schema (recommended).
- **Technical & Clinical Impact:** Determines whether unit foreign keys are mandatory across all incident and user records, and whether PMKP cross-unit queries are permitted.
- **Affected Entities:** `units`, `role_assignments`, `incident_reports`.
- **Affected Workflow:** Incident routing, reporting, dashboard analytics aggregation.
- **Affected API:** `/api/v1/incidents` query filters (`unitId`), `/api/v1/reports/summary`.
- **Affected Tests:** Unit isolation test suites, cross-unit negative authorization tests.
- **Required Approver:** Hospital Medical Services Directorate, Head of IBS, Chair of PMKP Committee.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-02: Objective Criteria for Unit-Level Closure (`COMPLETED_BY_UNIT`)

- **Governing Matrix ID:** `DM-005`
- **Related ADR:** `ADR-002`
- **Source Requirement:** Blueprint `BR-09` (Line 118) & Line 183.
- **Current Status:** `DISABLED / PENDING POLICY`
- **Available Options:**
  - _Option A:_ Disallow unit closure entirely (all incidents must reach PMKP for official closure).
  - _Option B:_ Establish strict objective checklist for minor KNC (e.g. no patient impact, no medication error, zero harm, unit head investigation signed, PMKP notified).
  - _Option C:_ Leave unit closure unconstrained at unit head's discretion (rejected as high medicolegal risk).
- **Technical & Clinical Impact:** Controls whether a non-PMKP role can transition an incident to a terminal completed state.
- **Affected Entities:** `incident_reports.lifecycle_status`.
- **Affected Workflow:** `UNDER_REVIEW` / `SIMPLE_INVESTIGATION` -> `COMPLETED_BY_UNIT`.
- **Affected API:** `POST /api/v1/incidents/{id}/actions/complete-by-unit`.
- **Affected Tests:** Unit completion transition tests, negative tests for non-KNC incidents.
- **Required Approver:** Chair of PMKP Committee, Hospital Quality & Patient Safety Director.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-03: Terminal Lifecycle & Handoff for High-Risk Incidents (RCA Path)

- **Governing Matrix ID:** `DM-006`
- **Related ADR:** `ADR-002`
- **Source Requirement:** Blueprint `FR-05` (Line 102), `BR-06` (Line 114), and Post-MVP RCA (Line 90).
- **Current Status:** `BLOCKED / STAKEHOLDER DECISION REQUIRED`
- **Available Options:**
  - _Option A:_ Defer high-risk closure in MVP (KUNING/MERAH remains in `PMKP_REVIEW` or an explicit `REFERRED_FOR_RCA` status until external RCA completes).
  - _Option B:_ Allow PMKP to complete the IKP filing with an attached RCA referral reference number.
  - _Option C:_ Implement a full interactive RCA module (violates MVP scope line 144).
- **Technical & Clinical Impact:** Resolves the dead-end in the high-risk workflow state machine.
- **Affected Entities:** `incident_reports.lifecycle_status`, `pmkp_review_cycles.is_further_investigation_needed`.
- **Affected Workflow:** `ESCALATED_TO_PMKP` -> `PMKP_REVIEW` -> terminal state.
- **Affected API:** `POST /api/v1/incidents/{id}/actions/complete`, `POST /api/v1/incidents/{id}/actions/refer-rca`.
- **Affected Tests:** High-risk lifecycle end-to-end integration tests.
- **Required Approver:** Chair of PMKP Committee, Clinical Risk Management Lead.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-04: Branch-Changing Regrade Semantics & BIRU Exclusion

- **Governing Matrix ID:** `DM-007`
- **Related ADR:** `ADR-002`
- **Source Requirement:** Blueprint `FR-05` (Line 102) & Line 217.
- **Current Status:** `BLOCKED / PENDING POLICY`
- **Available Options:**
  - _Option A:_ Same-branch regrading only (Biru <-> Hijau; Kuning <-> Merah). Branch-crossing regrades prohibited.
  - _Option B:_ Allow branch-crossing with defined workflow resets (e.g., Low -> High mandates RCA; High -> Low routes to simple investigation).
  - _Option C:_ Formally add `BIRU` to permitted PMKP regrade target bands in the Blueprint.
- **Technical & Clinical Impact:** Controls database check constraints on `regraded_risk_band` and subsequent workflow branch dispatching.
- **Affected Entities:** `risk_decisions`, `incident_reports.lifecycle_status`.
- **Affected Workflow:** `PMKP_REVIEW` regrading command.
- **Affected API:** `POST /api/v1/incidents/{id}/actions/regrade`.
- **Affected Tests:** Branch regrade transition tests and state reset validations.
- **Required Approver:** Chair of PMKP Committee.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-05: Incident Addendum Authorship & Lifecycle Policy

- **Governing Matrix ID:** `DM-011`
- **Related ADR:** `ADR-006`
- **Source Requirement:** Blueprint `BR-04` (Line 111) & Line 82.
- **Current Status:** `PENDING POLICY`
- **Available Options:**
  - _Option A:_ Only original reporter may author addenda post-submission.
  - _Option B:_ Original reporter and Kepala Ruangan IBS may author addenda.
  - _Option C:_ Any authorized clinical role may author addenda post-submission; post-completion addenda require PMKP acknowledgment.
- **Technical & Clinical Impact:** Determines RBAC permission grants on `incident_addenda` table and whether post-completion addenda are allowed.
- **Affected Entities:** `incident_addenda`.
- **Affected Workflow:** Post-submit and post-completion report enrichment.
- **Affected API:** `POST /api/v1/incidents/{id}/addenda`.
- **Affected Tests:** Addendum authorization, immutability, and sequence tests.
- **Required Approver:** Hospital Legal / Medical Record Governance, PMKP Chair.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-06: Emergency Medical Record Number Correction Governance

- **Governing Matrix ID:** `DM-012`
- **Related ADR:** `ADR-006`
- **Source Requirement:** Blueprint Line 65 vs. `BR-04` (Line 111).
- **Current Status:** `PENDING GOVERNANCE APPROVAL`
- **Available Options:**
  - _Option A:_ Medical Record Department staff only may request and approve MR corrections.
  - _Option B:_ Kepala Ruangan IBS requests, PMKP approves, system applies atomically to projection.
  - _Option C:_ Prohibit direct MR updates entirely; record definitive MR exclusively via addendum.
- **Technical & Clinical Impact:** Determines whether `correction_requests` table is implemented and whether the incident projection's MR number can be modified post-submission.
- **Affected Entities:** `correction_requests`, `incident_reports.medical_record_number`.
- **Affected Workflow:** Emergency patient identification correction.
- **Affected API:** `POST /api/v1/incidents/{id}/corrections/medical-record`.
- **Affected Tests:** Correction request/approval tests, before/after audit assertions.
- **Required Approver:** Head of Medical Records Department (Rekam Medis), PMKP Chair.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-07: Audit Trail Integrity Level & Cryptographic Anchoring

- **Governing Matrix ID:** `DM-013`
- **Related ADR:** `ADR-007`
- **Source Requirement:** Blueprint `FR-06` (Line 103) & Line 227.
- **Current Status:** `STAKEHOLDER DECISION REQUIRED`
- **Available Options:**
  - _Option A:_ Restricted application append-only audit table with D1 transaction coupling (recommended minimum).
  - _Option B:_ Per-stream SHA-256 hash chaining linking each event to the preceding event hash.
  - _Option C:_ External immutable WORM sink / periodic cryptographic anchoring.
- **Technical & Clinical Impact:** Determines whether `audit_records` table includes `prev_hash` and `event_hash` columns and whether external anchoring services are configured.
- **Affected Entities:** `audit_records`.
- **Affected Workflow:** Event capture in all domain command transactions.
- **Affected API:** `GET /api/v1/incidents/{id}/audit-timeline`.
- **Affected Tests:** Hash verification test suites, transaction rollback assertions.
- **Required Approver:** Hospital Information Security Officer, Legal Counsel.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-08: Legal Adoption of Digital Attribution / E-Paraf

- **Governing Matrix ID:** `DM-014`
- **Related ADR:** `ADR-008`
- **Source Requirement:** Blueprint `BR-07` (Line 116) & Line 55.
- **Current Status:** `STAKEHOLDER DECISION REQUIRED`
- **Available Options:**
  - _Option A:_ Adopt system digital attribution as official administrative replacement for wet signature.
  - _Option B:_ Require physical signed and scanned paper archive alongside digital system.
  - _Option C:_ Integrate external certified digital signature provider (BSrE/Kominfo).
- **Technical & Clinical Impact:** Determines legal status labeling in PDF printouts and whether re-authentication is mandated on approvals.
- **Affected Entities:** `audit_records`, PDF print layout (`Screen 07`).
- **Affected Workflow:** Formal report submission, investigation approval, case completion.
- **Affected API:** Re-authentication headers / confirmation payload checks.
- **Affected Tests:** Attribution snapshot rendering tests on PDF templates.
- **Required Approver:** RSUD Prof. Dr. W. Z. Johannes Hospital Director, Legal Counsel.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-09: Evidence Attachment Feature Inclusion in MVP

- **Governing Matrix ID:** `DM-016`
- **Related ADR:** `ADR-010`, `ADR-014`
- **Source Requirement:** Blueprint Line 219/226 vs. MVP Scope Line 144.
- **Current Status:** `CONDITIONAL / DEFERRED FROM MVP`
- **Available Options:**
  - _Option A:_ Defer file uploads from MVP; implement textual references only (recommended).
  - _Option B:_ Include R2 file uploads in MVP with strict private bucket, MIME/magic-byte checks, and two-phase upload reconciliation.
- **Technical & Clinical Impact:** Determines whether R2 bucket bindings, upload intent tables, and reconciliation workers are deployed.
- **Affected Entities:** `incident_attachments`, `attachment_uploads`.
- **Affected Workflow:** Evidence attachment during incident reporting or investigation.
- **Affected API:** `/api/v1/incidents/{id}/attachments/*`.
- **Affected Tests:** R2/D1 consistency tests, virus scan simulation tests.
- **Required Approver:** Product Owner, PMKP Chair, Security Officer.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-10: Medical Record & Incident Data Retention Schedule

- **Governing Matrix ID:** `DM-018`
- **Related ADR:** `ADR-011`
- **Source Requirement:** Blueprint `BR-02` (Confidentiality) and hospital record governance.
- **Current Status:** `STAKEHOLDER DECISION REQUIRED`
- **Available Options:**
  - _Option A:_ Retain incident reports permanently (aligned with general hospital quality archives).
  - _Option B:_ Retain active records for 5–10 years, followed by offline encrypted archival.
- **Technical & Clinical Impact:** Establishes data lifecycle policies; governs whether automatic archival or retention timestamping is modeled in D1.
- **Affected Entities:** All clinical and audit tables.
- **Affected Workflow:** Archival, data disposition, legal hold execution.
- **Affected API:** Administrative archival query filters.
- **Affected Tests:** Retention lifecycle assertions and legal hold override tests.
- **Required Approver:** Head of Medical Records, Hospital Legal Counsel.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-11: Incident Subject Conditionality (Patient vs. Staf K3RS)

- **Governing Matrix ID:** `DM-022`
- **Source Requirement:** Form IKP Bagian I & II vs. Blueprint Data Dictionary.
- **Current Status:** `STAKEHOLDER DECISION REQUIRED`
- **Available Options:**
  - _Option A:_ Enforce patient fields as nullable when `incident_target = 'STAF_K3RS'` (recommended).
  - _Option B:_ Restrict the application strictly to patient safety incidents (exclude staff K3RS incidents).
- **Technical & Clinical Impact:** Directly dictates column nullability and database CHECK constraints on `incident_submission_snapshots`.
- **Affected Entities:** `incident_submission_snapshots`.
- **Affected Workflow:** Form Wizard Step 1 & 2 validation.
- **Affected API:** `POST /api/v1/incidents` payload validation.
- **Affected Tests:** Staff occupational incident validation tests.
- **Required Approver:** Head of K3RS, PMKP Chair.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING

---

### DDR-12: Physical Form IKP Source Verification & Field Mapping

- **Governing Matrix ID:** `DM-024`
- **Source Requirement:** `docs/Form IKP.pdf` (scanned document).
- **Current Status:** `STAKEHOLDER DECISION REQUIRED`
- **Available Options:**
  - _Option A:_ Convene formal joint review between engineering and PMKP to verify all 19 field groups against physical paper form.
  - _Option B:_ Re-scan `Form IKP.pdf` in high-resolution searchable OCR format to allow machine verification.
- **Technical & Clinical Impact:** Ensures the digital form wizard and PDF printout are 100% compliant with physical accreditation forms.
- **Affected Entities:** All clinical form fields.
- **Affected Workflow:** Form Wizardpengisian, print preview `/cetak`.
- **Affected API:** Submission DTO schemas.
- **Affected Tests:** PDF visual regression tests.
- **Required Approver:** Head of IBS, PMKP Accreditation Lead.
- **Approval Evidence:** PENDING
- **Decision Date:** PENDING
