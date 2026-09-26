# Stakeholder Decision Package: Architecture & Domain Governance

## Executive Summary & Guide for Decision Makers

This document is an executive decision package prepared for the **Direksi RSUD Prof. Dr. W. Z. Johannes Kupang, Komite PMKP, Instalasi Bedah Sentral (IBS), Instalasi SIMRS/IT, and Hospital Legal/Security Officers**.

It isolates the **12 critical governance decisions** that currently block production Cloudflare D1 database schema generation and API implementation. Each decision item presents the background, available options, multi-dimensional consequences, and technical recommendations.

> **CRITICAL DISCLAIMER FOR REVIEWERS:**  
> **`TECHNICAL RECOMMENDATION — NOT A DECISION`**  
> All recommendations provided in this document represent the conclusions of engineering and security architecture analysis. They do **NOT** constitute approved policy. No production database migration or business endpoint will be deployed until the designated institutional authorities formally sign off on each item.

---

# Decision Item 01: System Scope & Organizational Boundary (ADR-001 / DDR-01 / DM-001)

1. **Decision ID:** `DDR-01` (`ADR-001`, `DM-001`)
2. **Decision Title:** System Organizational Scope: IBS-First vs. Hospital-Wide Deployment
3. **Current State:** `STAKEHOLDER DECISION REQUIRED` (Unapproved)
4. **Why Decision is Needed:** The Product Blueprint title specifies an IBS reporting system, but Section 4.4 states that Komite PMKP accesses incident reports across the entire hospital. Without resolving this boundary, database foreign keys and query predicates cannot be finalized.
5. **Source / Reference:** Blueprint Section 1 (line 19) vs. Section 4.4 (line 124); `docs/AI-Product-Blueprint-*.md`.
6. **Options Considered:**
   - _Option A:_ Strict IBS-only application with hardcoded IBS unit strings.
   - _Option B:_ Immediate hospital-wide deployment onboarding all wards on Day 1.
   - _Option C:_ IBS-first deployment utilizing a multi-unit capable relational schema (`units`, `role_assignments`).
7. **Technical Consequences:** Option C requires foreign keys to a `units` table and multi-dimensional query filtering.
8. **Operational Consequences:** Option C allows IBS to pilot immediately without burdening other wards, while enabling future hospital-wide rollout without schema migration rewrite.
9. **Security Consequences:** Option C enforces strict unit isolation in database queries, preventing horizontal data leakage between wards under `BR-02`.
10. **Data Consequences:** Every incident report stores an explicit `owning_unit_id` foreign key.
11. **Workflow Consequences:** Incident queues, verifications, and unit dashboards are automatically scoped to the user's active unit assignment.
12. **Recommended Technical Option:** **Option C (IBS-first deployment with multi-unit capable relational schema).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Hospital Directorate (Direksi RSUD Prof. Dr. W. Z. Johannes), Head of IBS, Chair of PMKP Committee.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 02: Authentication & Session Management Architecture (ADR-004 / DM-019 / DCP-01)

1. **Decision ID:** `DCP-01` (`ADR-004`, `DM-019`)
2. **Decision Title:** Authentication Architecture: Server-Side Opaque Session vs. Stateless JWT
3. **Current State:** `STAKEHOLDER DECISION REQUIRED` (Unapproved deviation from literal Blueprint text)
4. **Why Decision is Needed:** The Blueprint line 144 explicitly says "Auth JWT". However, frontline surgical staff share physical PC terminals where clinicians rotate frequently. Pure stateless JWTs cannot reliably enforce the mandated 15-minute sliding idle timeout (`FR-01`), cannot immediately revoke sessions on logout, and cannot immediately terminate sessions when an account is disabled or credentials change.
5. **Source / Reference:** Blueprint line 98 (`FR-01`), line 144 (MVP Scope), line 150 (Security NFR).
6. **Options Considered:**
   - _Option A:_ Server-side opaque session token stored in a `__Host-` Secure, HttpOnly cookie; hashed session record in Cloudflare D1.
   - _Option B:_ Pure stateless JWT authentication in browser storage or cookie.
   - _Option C:_ Hybrid short-lived access token (2–5 min) + rotating refresh session in D1.
7. **Technical Consequences:** Option A requires a fast indexed lookup in D1 per request; activity updates are throttled (once every 60s) to conserve D1 writes.
8. **Operational Consequences:** Clinicians who step away from a theater PC are guaranteed to be locked out after 15 minutes of inactivity; logging out immediately prevents the next person from accessing their session.
9. **Security Consequences:** Immune to XSS exfiltration (HttpOnly cookie); protected from CSRF via `SameSite=Strict` and custom `X-CSRF-Token` header.
10. **Data Consequences:** Requires a `sessions` table in D1.
11. **Workflow Consequences:** Zero disruption to clinical workflow; transparent session maintenance while actively typing.
12. **Recommended Technical Option:** **Option A (Server-side opaque session in HttpOnly cookie).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** IT / System Owner (Kepala Instalasi SIMRS/IT), Hospital Information Security Officer, PMKP Chair.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 03: Password Security Standards, KDF, and MFA Scope (ADR-018 / DM-020 / DCP-02)

1. **Decision ID:** `DCP-02` (`ADR-018`, `DM-020`, `DM-033`)
2. **Decision Title:** Credential Storage Standard, Password Policy, and Multi-Factor Authentication Scope
3. **Current State:** `STAKEHOLDER DECISION REQUIRED` (Unapproved)
4. **Why Decision is Needed:** Blueprint line 98 uses the unscientific term "Password terenkripsi". Reversible encryption is an insecure practice that exposes all staff passwords if the database is breached. A modern adaptive hashing standard, minimum length, lockout threshold, and MFA policy must be formally adopted.
5. **Source / Reference:** Blueprint line 87 (Modul 9), line 98 (`FR-01`), line 212 (Data Dictionary).
6. **Options Considered:**
   - _Hashing:_ Argon2id via Wasm (preferred) vs. PBKDF2-HMAC-SHA-256 (>=600,000 iterations via Web Crypto API).
   - _MFA Scope:_ Role-based MFA (mandatory for `ADMINISTRATOR` and `KOMITE_PMKP` via TOTP; single-factor for frontline nurses/doctors) vs. Hospital-wide MFA for all staff vs. Zero MFA for initial release.
   - _Lockout:_ 10 failed attempts triggers 15-minute temporary lockout.
7. **Technical Consequences:** Edge isolate must benchmark Argon2id Wasm CPU consumption; fallback to PBKDF2 if CPU quota is constrained.
8. **Operational Consequences:** Frontline operating theater staff are not delayed by phone-based MFA during emergency surgeries; privileged administrative and committee oversight accounts receive high-assurance MFA protection.
9. **Security Consequences:** Protects against credential stuffing and brute force without encouraging insecure password post-it notes on theater PCs.
10. **Data Consequences:** Requires `user_credentials` and `mfa_credentials` tables in D1.
11. **Workflow Consequences:** Staff use 12+ character passphrases; automated temporary lockouts reset after 15 minutes.
12. **Recommended Technical Option:** **Argon2id (fallback PBKDF2 >=600k) + Role-Based MFA for Admin and PMKP only + 12-char passphrase policy.**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Hospital Information Security Officer, IT / System Owner, Clinical Governance Lead.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 04: Repeated Revision Cycles vs. 1:1 Investigation Tables (ADR-006 / DDR-03 / DCP-03)

1. **Decision ID:** `DCP-03` (`ADR-006`, `DM-010`)
2. **Decision Title:** Data Model for Repeated PMKP Revisions: 1:N Versioned Revisions vs. 1:1 Unique Constraint
3. **Current State:** `STAKEHOLDER DECISION REQUIRED` (Unapproved)
4. **Why Decision is Needed:** Blueprint data dictionary line 214 and 217 defined simple investigation and PMKP evaluation with `FK Unique`. However, Blueprint line 67 and 102 state PMKP can return incomplete investigations for revision repeatedly. A 1:1 unique constraint in SQLite/D1 forces subsequent revisions to overwrite prior findings, destroying historical evidence.
5. **Source / Reference:** Blueprint Section 5.1 (`FR-05`), Section 6.2 (line 214 & 217), Section 7.2 (Flow 3).
6. **Options Considered:**
   - _Option A:_ Maintain 1:1 table and overwrite data on revision (violates medicolegal auditability).
   - _Option B:_ Adopt 1:N versioned revisions (`investigation_revisions`) and 1:N review cycles (`pmkp_review_cycles`).
7. **Technical Consequences:** Downstream queries select the current working revision (`revision_number = current_revision`); prior revisions are permanently read-only.
8. **Operational Consequences:** PMKP and unit heads can view the exact chronological evolution of root-cause analyses and corrective action plans across revision rounds.
9. **Security Consequences:** Guarantees historical data immutability and complete audit trail integrity.
10. **Data Consequences:** Requires composite child tables (`investigation_recommendations`, `investigation_actions`) referencing `revision_id`.
11. **Workflow Consequences:** Enables deterministic return-and-resubmit workflow (`REVISION_REQUIRED` -> `SUBMITTED_TO_PMKP`).
12. **Recommended Technical Option:** **Option B (1:N versioned investigation revisions and PMKP review cycles).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Chair of PMKP Committee, Hospital Legal Counsel, Technical Architecture Lead.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 05: High-Risk Escalation & Terminal RCA Handoff Lifecycle (ADR-002 / DDR-03 / DM-006)

1. **Decision ID:** `DDR-03` (`ADR-002`, `DM-006`)
2. **Decision Title:** Terminal Lifecycle and Handoff for High-Risk Incidents (KUNING / MERAH) Requiring RCA
3. **Current State:** `BLOCKED / STAKEHOLDER DECISION REQUIRED` (Workflow dead-end in current specification)
4. **Why Decision is Needed:** Incidents graded KUNING or MERAH escalate to PMKP. In `PMKP_REVIEW`, if PMKP decides further RCA is required (`is_further_investigation_needed = YA`), the case cannot be marked `COMPLETED` because RCA is unfinished. However, interactive RCA is listed as post-MVP (line 90), creating a state machine dead-end with no terminal path.
5. **Source / Reference:** Blueprint line 90 (Modul 11), line 102 (`FR-05`), line 114 (`BR-06`).
6. **Options Considered:**
   - _Option A:_ Create a formal handoff state `REFERRED_FOR_RCA` where PMKP closes the initial IKP intake and attaches an external RCA tracking reference number.
   - _Option B:_ Keep incident in `PMKP_REVIEW` indefinitely until an external RCA is completed, preventing closure.
   - _Option C:_ Build an interactive RCA diagram module in MVP (violates line 144 MVP scope).
7. **Technical Consequences:** Option A adds an explicit terminal handoff state (`REFERRED_FOR_RCA`) with external reference metadata.
8. **Operational Consequences:** PMKP can officially complete their initial 48-hour intake obligations and dispatch a clinical risk team for in-depth RCA without leaving the digital incident stranded.
9. **Security Consequences:** Clear audit trail recording who authorized the RCA escalation and when handoff occurred.
10. **Data Consequences:** Adds `rca_referral_number` and `rca_lead_investigator` to PMKP evaluation table.
11. **Workflow Consequences:** Provides a sound, non-deadlock exit condition for high-risk clinical events.
12. **Recommended Technical Option:** **Option A (Introduce formal `REFERRED_FOR_RCA` terminal handoff state in MVP).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Chair of PMKP Committee, Medical Services Directorate, Clinical Risk Manager.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 06: Incident Addenda Authorship & Lifecycle Policy (ADR-006 / DDR-05 / DM-011 / DCP-04)

1. **Decision ID:** `DCP-04` (`ADR-006`, `DDR-05`, `DM-011`)
2. **Decision Title:** Formal Specification and Authorship Governance of Incident Addenda (`incident_addenda`)
3. **Current State:** `PENDING POLICY` (Missing entity in Blueprint data dictionary)
4. **Why Decision is Needed:** Blueprint `BR-04` mandates that clinical facts arising post-submit must use an addendum history, but the Blueprint's data dictionary completely omitted this table, and did not specify who is allowed to author an addendum or whether addenda are permitted post-completion.
5. **Source / Reference:** Blueprint Section 3.1 (line 82), Section 5.2 (`BR-04`, line 111).
6. **Options Considered:**
   - _Option A:_ Original reporter only may append addenda post-submission.
   - _Option B:_ Original reporter and Kepala Ruangan IBS may append addenda; post-completion addenda require PMKP acknowledgment.
   - _Option C:_ Prohibit addenda entirely and force formal report corrections.
7. **Technical Consequences:** Requires adding `incident_addenda` table linked to `incident_reports` with strict append-only constraints.
8. **Operational Consequences:** Staff who discover late clinical updates (e.g. lab results confirming ceftriaxone allergy) can append facts cleanly without altering the original narrative.
9. **Security Consequences:** Zero mutation of submitted clinical snapshot; addendum author identity is immutably snapshotted.
10. **Data Consequences:** Addenda records store sequential sequence numbers, author snapshots, justification, and server timestamps.
11. **Workflow Consequences:** Appending an addendum emits an `ADDENDUM_APPENDED` audit event and alerts the assigned supervisor.
12. **Recommended Technical Option:** **Option B (Reporter and Unit Head may author addenda post-submit; PMKP acknowledged post-completion).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Hospital Legal / Medical Record Governance, Chair of PMKP Committee, Head of IBS.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 07: Emergency Medical Record Number Correction Governance (ADR-006 / DDR-06 / DM-012 / DCP-08)

1. **Decision ID:** `DCP-08` (`ADR-006`, `DDR-06`, `DM-012`)
2. **Decision Title:** Reconciling Temporary Emergency MR Number Updates with Permanent Submission Immutability
3. **Current State:** `PENDING GOVERNANCE APPROVAL` (Conflicting requirements in Blueprint)
4. **Why Decision is Needed:** Blueprint line 65 states temporary emergency MR numbers (e.g. `EMERGENCY-20260926-01`) may be updated to permanent numbers later. However, `BR-04` (line 111) states primary fields are permanently locked post-submit. In-place database overwrites violate auditability.
5. **Source / Reference:** Blueprint Section 2.2 (line 65) vs. Section 5.2 (`BR-04`, line 111).
6. **Options Considered:**
   - _Option A:_ Direct database overwrite of MR number (violates `BR-04`).
   - _Option B:_ Formal `correction_requests` workflow: Head of Room requests, Medical Records approves, system updates display projection while preserving original submitted value in immutable snapshot.
   - _Option C:_ Forbid MR number correction completely (leaves emergency records permanently unlinked in SIMRS).
7. **Technical Consequences:** Implements `correction_requests` table and an auditable projection update mechanism.
8. **Operational Consequences:** Patients admitted under trauma/emergency surgery can be updated to their verified identity once registered by Medical Records.
9. **Security Consequences:** Eliminates silent record tampering; captures before value, after value, requester, approver, and timestamp.
10. **Data Consequences:** Original `incident_submission_snapshots.medical_record_number` remains unchanged; `incident_reports.medical_record_number` reflects verified identifier.
11. **Workflow Consequences:** Governed correction flow with dual-control approval.
12. **Recommended Technical Option:** **Option B (Formal `correction_requests` workflow with Medical Records / PMKP approval).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Head of Medical Records Department (Instalasi Rekam Medis), Chair of PMKP Committee.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 08: Legal Adoption of Digital Attribution / E-Paraf (ADR-008 / DDR-08 / DM-014 / DCP-05)

1. **Decision ID:** `DCP-05` (`ADR-008`, `DDR-08`, `DM-014`)
2. **Decision Title:** Formal Hospital Adoption of Digital Attribution / E-Paraf as Official Replacement for Wet Signature
3. **Current State:** `STAKEHOLDER DECISION REQUIRED` (Unapproved legal claim)
4. **Why Decision is Needed:** Blueprint line 55 and line 116 claim that system digital records legally replace physical wet signatures/paraf. An engineering system cannot grant statutory legal validity to its own database records without an official hospital director decree (Peraturan Direktur). Furthermore, Blueprint line 218 omitted NIP from the audit table, violating `BR-07`.
5. **Source / Reference:** Blueprint line 55, line 116 (`BR-07`), line 218 (Data Dictionary).
6. **Options Considered:**
   - _Option A:_ Formal hospital director decree adopting system digital attribution (Name, NIP, Role, Unit, Timestamp, Request ID) as the official administrative signature replacement for internal hospital IKP governance.
   - _Option B:_ Dual system: print and sign physical paper alongside digital entry (defeats efficiency goals).
   - _Option C:_ External statutory certified digital signature (BSrE / Kominfo integration) (costly and complex).
7. **Technical Consequences:** Schema adds `actor_nip_nrp` to `audit_records`; PDF print template embeds formal verification block.
8. **Operational Consequences:** Eliminates the physical circulation of paper forms across surgical theaters and quality offices.
9. **Security Consequences:** Re-authentication (password confirmation) mandated on critical approval actions (`SUBMIT_REPORT`, `APPROVE_INVESTIGATION`, `COMPLETE_REPORT`).
10. **Data Consequences:** Captures immutable actor snapshot values at the moment of action.
11. **Workflow Consequences:** Frictionless, paperless verification across all shifts.
12. **Recommended Technical Option:** **Option A (Official hospital decree adopting system digital attribution + NIP schema correction).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Hospital Directorate (Direktur RSUD Prof. Dr. W. Z. Johannes), Hospital Legal Counsel, Medical Records Lead.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 09: Evidence Attachment Inclusion in MVP (ADR-010 / DDR-09 / DM-016)

1. **Decision ID:** `DDR-09` (`ADR-010`, `ADR-014`, `DM-016`)
2. **Decision Title:** Decision on Deploying Cloudflare R2 Evidence File Uploads in Phase 07 (MVP)
3. **Current State:** `CONDITIONAL / DEFERRED FROM MVP` (Unresolved scope discrepancy)
4. **Why Decision is Needed:** Blueprint lines 219 and 226 describe R2 storage for incident attachments, but attachments are completely absent from Functional Requirements (`FR-01` s/d `FR-07`) and the explicit MVP scope list in line 144. Deploying file uploads introduces malware risks, storage costs, and R2/D1 reconciliation complexity.
5. **Source / Reference:** Blueprint Section 4.3 (line 144) vs. Section 6.2 (line 219) & Section 6.3 (line 226).
6. **Options Considered:**
   - _Option A:_ Defer file uploads from MVP; implement text-only incident reporting and simple investigations (recommended).
   - _Option B:_ Deploy Cloudflare R2 in MVP with strict private buckets, allowlisted PDF/JPEG types, 5MB limit, and two-phase upload reconciliation (`ADR-014`).
7. **Technical Consequences:** Option A eliminates R2 binding complexity and file scanning requirements in initial schema.
8. **Operational Consequences:** Option A focuses initial clinical adoption on timely narrative reporting; attachments can be added in a planned update.
9. **Security Consequences:** Option A completely eliminates file-based malware, stored XSS, and unauthenticated object enumeration risks in the first release.
10. **Data Consequences:** Omit `incident_attachments` and `attachment_uploads` tables from initial D1 migration.
11. **Workflow Consequences:** Zero disruption to core incident reporting and investigation flows.
12. **Recommended Technical Option:** **Option A (Defer R2 file uploads from MVP; activate textual incident reporting first).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Product Owner / Hospital IT Lead, Chair of PMKP Committee.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 10: Medical Record & Quality Incident Retention Policy (ADR-011 / DDR-10 / DM-018)

1. **Decision ID:** `DDR-10` (`ADR-011`, `DM-018`)
2. **Decision Title:** Establishment of Official Incident and Audit Record Retention Schedule
3. **Current State:** `STAKEHOLDER DECISION REQUIRED` (Unspecified in project documents)
4. **Why Decision is Needed:** Software engineers cannot invent data destruction schedules or legal-hold policies for hospital clinical records. An official retention schedule is required before automated archival or purging jobs can be designed.
5. **Source / Reference:** Blueprint `BR-02` (Confidentiality) and National Hospital Accreditation Standards.
6. **Options Considered:**
   - _Option A:_ Permanent digital retention for all incident records, revisions, and audit trails (recommended for hospital safety indicators).
   - _Option B:_ Active database retention for 5 years, followed by automated encrypted archival.
7. **Technical Consequences:** Option A avoids complex automated purge workers and simplifies D1 storage planning.
8. **Operational Consequences:** Guarantees longitudinal hospital quality data is available for multi-year accreditation reviews.
9. **Security Consequences:** Deactivated user accounts and historical attribution remain intact indefinitely.
10. **Data Consequences:** Zero TTL or automated deletion workers deployed in D1.
11. **Workflow Consequences:** Historical reports remain accessible for read-only audit review.
12. **Recommended Technical Option:** **Option A (Permanent digital retention of clinical incident and audit records).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Head of Medical Records Department (Instalasi Rekam Medis), Hospital Legal Counsel.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 11: Incident Subject Conditionality: Patient vs. Staf K3RS (DDR-11 / DM-022 / DCP-07)

1. **Decision ID:** `DCP-07` (`DDR-11`, `DM-022`)
2. **Decision Title:** Permitting Nullable Patient Demographics for Staff Safety Incidents (K3RS)
3. **Current State:** `STAKEHOLDER DECISION REQUIRED` (Data dictionary gap)
4. **Why Decision is Needed:** Form IKP allows Subjek Insiden to be `Karyawan/Staf K3RS`. In an occupational hazard (e.g., nurse splash exposure or scalpel injury), there is no patient name, medical record number, or admission time. The database schema must allow patient fields to be nullable when subject is staff.
5. **Source / Reference:** Form IKP Bagian II vs. Blueprint line 33 & line 213.
6. **Options Considered:**
   - _Option A:_ Enforce patient fields as nullable when `incident_target = 'STAF_K3RS'` (recommended).
   - _Option B:_ Exclude staff safety incidents from this system (mandate patient incidents only).
7. **Technical Consequences:** Database column definition uses `NULL` with conditional `CHECK` constraint.
8. **Operational Consequences:** Clinicians can report staff occupational injuries cleanly without fabricating fake patient data.
9. **Security Consequences:** Prevents data pollution in hospital safety databases.
10. **Data Consequences:** Bagian I patient columns are conditionally optional based on `incident_target`.
11. **Workflow Consequences:** Wizard Step 1 conditionally hides patient demographics when staff incident is selected.
12. **Recommended Technical Option:** **Option A (Conditional nullability for staff K3RS incidents).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Head of K3RS (Kesehatan & Keselamatan Kerja RS), Chair of PMKP Committee.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None

---

# Decision Item 12: Physical Form IKP Field-by-Field Verification (DDR-12 / DM-024)

1. **Decision ID:** `DDR-12` (`DM-024`)
2. **Decision Title:** Formal Field-by-Field Source Verification of Physical Form IKP
3. **Current State:** `STAKEHOLDER DECISION REQUIRED` (Unverified scan)
4. **Why Decision is Needed:** `docs/Form IKP.pdf` is a scanned document that could not be text-extracted. A joint human review between engineering and PMKP is required to guarantee 100% field fidelity before database columns are locked.
5. **Source / Reference:** `docs/Form IKP.pdf`, `docs/ARCHITECTURE-AUDIT.md:19`.
6. **Options Considered:**
   - _Option A:_ Convene formal joint verification session between IT engineering and PMKP leadership to review the 58 candidate fields in `docs/FORM-I-KP-DATA-TRACEABILITY.md` against physical hospital forms.
   - _Option B:_ Re-scan `Form IKP.pdf` using high-resolution OCR.
7. **Technical Consequences:** Validates the exact column names, enums, and age cohorts before generating DDL.
8. **Operational Consequences:** Guarantees digital system matches hospital accreditation expectations exactly.
9. **Security Consequences:** Prevents post-launch database refactoring.
10. **Data Consequences:** Produces the ratified field mapping for Phase 07 migrations.
11. **Workflow Consequences:** Confirms all 19 form data categories are accounted for.
12. **Recommended Technical Option:** **Option A (Convene formal joint verification session).**
13. **Disclaimer:** `TECHNICAL RECOMMENDATION — NOT A DECISION`
14. **Required Approver:** Head of Central Surgical Installation (IBS), PMKP Accreditation Lead.
15. **Approval Evidence:** PENDING
16. **Decision Date:** PENDING
17. **Review Date:** PENDING
18. **Supersession:** None
