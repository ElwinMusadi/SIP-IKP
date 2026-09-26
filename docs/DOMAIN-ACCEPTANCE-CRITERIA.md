# Canonical Domain Acceptance Criteria

## 1. Governance Status and Interpretation

# STATUS: CANDIDATE DOMAIN ACCEPTANCE CRITERIA — PROVISIONAL PENDING ADR APPROVAL

These criteria constitute the functional and domain acceptance baseline for verifying the incident reporting lifecycle, simple investigation worksheet, PMKP quality review, risk grading, and data integrity boundaries.

**GATING DISCIPLINE:** Criteria marked `PENDING` depend on unapproved stakeholder decisions and cannot be certified as passing until those decisions are ratified.

---

## 2. Incident Reporting Acceptance Criteria

| Criteria ID    | Category         | Requirement Statement                                                                                                                                                                                                         | Verification Method                                                                     | Status             |
| -------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------ |
| **DAC-INC-01** | Identity         | Every submitted incident report receives an atomically allocated, globally unique human-readable report number formatted as `IKP/IBS/YYYYMM/XXXX` with an immutable sequence number.                                          | D1 test harness concurrent submission assertions.                                       | PENDING (`DM-021`) |
| **DAC-INC-02** | Demographics     | When incident subject is `PASIEN`, all Bagian I patient demographics (Nama, No. MR, Ruangan, Umur, Jenis Kelamin, Penjamin, Jam Masuk) are strictly validated and non-empty.                                                  | Domain validator unit tests with patient subject payload.                               | Active Candidate   |
| **DAC-INC-03** | Conditionality   | When incident subject is `STAF_K3RS` or non-patient, patient demographics are nullable and not enforced, allowing occupational hazard reporting without dummy patient data.                                                   | Domain validator unit tests with staff subject payload.                                 | PENDING (`DM-022`) |
| **DAC-INC-04** | Chronology       | The incident chronology narrative (5W+1H) must accept up to 10,000 characters of plain UTF-8 text, preserving paragraph breaks while rejecting executable HTML tags.                                                          | Domain validator unit tests asserting plain-text preservation and length enforcement.   | Active Candidate   |
| **DAC-INC-05** | Classification   | Incident type must be strictly validated against the 4 canonical KNKP categories: `KNC`, `KTC`, `KTD`, `SENTINEL`. Arbitrary strings are rejected.                                                                            | Schema validation tests asserting rejection of unapproved types.                        | Active Candidate   |
| **DAC-INC-06** | Immediate Action | Every report must document the immediate clinical response taken, the patient stabilization result, and the category of actor who performed the action (`Dokter`, `Perawat`, `Petugas Lain`, `Tim`).                          | Form submission validation assertions.                                                  | Active Candidate   |
| **DAC-INC-07** | SLA Tracking     | The system automatically computes `is_overdue_sla = TRUE` if the server submission timestamp exceeds `incident_occurred_at_utc + 48 hours`. If overdue, submission is rejected unless non-empty `overdue_reason` is provided. | Fixed-clock integration tests verifying boundary at 48h00m00s vs 48h00m01s (`ADR-009`). | Active Candidate   |
| **DAC-INC-08** | Submission Lock  | Upon formal submission, the `incident_submission_snapshots` record is permanently locked. Direct `UPDATE` or `DELETE` requests targeting submitted clinical data return `403 Forbidden` or `405 Method Not Allowed`.          | Repository unit tests asserting zero update operations on submission snapshot.          | Active Candidate   |

---

## 3. Workflow State Transition Acceptance Criteria

| Criteria ID   | Category         | Requirement Statement                                                                                                                                                                                   | Verification Method                                                       | Status             |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------ |
| **DAC-WF-01** | Draft Transition | An incident in `DRAFT` status transitions to `SUBMITTED` only when the owning healthcare worker executes `SUBMIT_REPORT` with valid confirmation. Generic status patches are rejected.                  | State machine transition tests.                                           | Active Candidate   |
| **DAC-WF-02** | Unit Receipt     | An incident in `SUBMITTED` status transitions to `UNDER_REVIEW` only when an authorized Kepala Ruangan IBS executes `RECEIVE_REPORT`. Receipt timestamp and actor snapshot are captured.                | Integration test with Kepala Ruangan session.                             | Active Candidate   |
| **DAC-WF-03** | Low Risk Branch  | In `UNDER_REVIEW`, assigning `BIRU` or `HIJAU` transitions the report to `SIMPLE_INVESTIGATION` and initializes working revision 1 of the investigation worksheet.                                      | State machine transition tests.                                           | Active Candidate   |
| **DAC-WF-04** | High Risk Branch | In `UNDER_REVIEW`, assigning `KUNING` or `MERAH` requires non-empty initial mitigation notes and transitions the report to `ESCALATED_TO_PMKP`, closing the simple investigation worksheet.             | State machine transition tests asserting mitigation notes mandate.        | Active Candidate   |
| **DAC-WF-05** | Unit Completion  | In `UNDER_REVIEW` or `SIMPLE_INVESTIGATION`, closing a very minor KNC at unit level (`COMPLETED_BY_UNIT`) is **BLOCKED and rejected** by server validation until objective minor criteria are approved. | Negative API test asserting command returns `403/409 Policy Not Enabled`. | PENDING (`DM-005`) |
| **DAC-WF-06** | PMKP Intake      | Incidents in `SUBMITTED_TO_PMKP` or `ESCALATED_TO_PMKP` transition to `PMKP_REVIEW` when an authorized PMKP reviewer opens and acknowledges review intake.                                              | State machine transition tests with PMKP session.                         | Active Candidate   |
| **DAC-WF-07** | Revision Loop    | In `PMKP_REVIEW`, evaluating completeness as `TIDAK` transitions the incident to `REVISION_REQUIRED`, records formal directives, and allows Kepala Ruangan to submit revision N+1.                      | Iterative revision transition integration tests.                          | Active Candidate   |
| **DAC-WF-08** | Official Closure | In `PMKP_REVIEW`, an incident transitions to `COMPLETED` only if `is_investigation_complete = YA` AND `is_further_investigation_needed = TIDAK`.                                                        | PMKP completion truth table tests.                                        | Active Candidate   |
| **DAC-WF-09** | RCA Block        | In `PMKP_REVIEW`, if `is_further_investigation_needed = YA`, transition to `COMPLETED` is **STRICTLY REJECTED**, preventing premature closure of high-risk cases.                                       | Negative completion tests asserting rejection when RCA is needed.         | PENDING (`DM-006`) |

---

## 4. Simple Investigation Acceptance Criteria

| Criteria ID    | Category           | Requirement Statement                                                                                                                                                                     | Verification Method                                           | Status           |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------- |
| **DAC-INV-01** | Date Range Rule    | The investigation worksheet enforces `investigation_end_date >= investigation_start_date` (`BR-08`). Setting an end date prior to start date is rejected with `422 Unprocessable Entity`. | Database check constraint and domain validator tests.         | Active Candidate |
| **DAC-INV-02** | Child Row Bounds   | Submitting an investigation worksheet requires at least one recommendation and at least one corrective action plan. Empty action tables are rejected.                                     | Domain validator assertions on `SUBMIT_INVESTIGATION`.        | Active Candidate |
| **DAC-INV-03** | Target Dates       | Each recommendation and action plan row must specify a responsible person and a target implementation date (`target_date`).                                                               | Schema check assertions on child rows.                        | Active Candidate |
| **DAC-INV-04** | Unit Head Sign-off | Submitting an investigation worksheet to PMKP requires digital sign-off by the Kepala Ruangan, capturing an immutable attribution snapshot (`BR-07`).                                     | Attribution snapshot assertion in D1.                         | Active Candidate |
| **DAC-INV-05** | Revision History   | When an investigation is returned for revision, the prior submitted revision record and child rows remain immutable. The unit head edits revision N+1.                                    | Repository tests asserting prior revision rows are unmutated. | Active Candidate |

---

## 5. Security & Access Boundary Acceptance Criteria

| Criteria ID    | Category             | Requirement Statement                                                                                                                                                                                  | Verification Method                                                   | Status             |
| -------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------ |
| **DAC-SEC-01** | Ownership Isolation  | Frontline healthcare workers (`TENAGA_KESEHATAN`) can only query and view reports created by their own user ID (`created_by_user_id == current_user_id`). Accessing another user's ID returns 404/403. | Negative authorization tests with cross-user IDs.                     | Active Candidate   |
| **DAC-SEC-02** | Unit Isolation       | Kepala Ruangan IBS can only access incidents where `owning_unit_id` matches their assigned unit (`IBS`). Querying incidents belonging to other hospital departments returns 404/403.                   | Negative authorization tests with cross-unit IDs.                     | Active Candidate   |
| **DAC-SEC-03** | Admin Narrative Gate | Administrators (`ADMINISTRATOR`) have zero default access to clinical incident narratives, patient medical records, or chronology fields.                                                              | Negative API authorization tests verifying 403 on clinical endpoints. | PENDING (`DM-036`) |
| **DAC-SEC-04** | Atomic Audit         | Every domain state transition, initial grading, regrading, revision request, and completion commits its corresponding `audit_records` row in the same atomic D1 transaction.                           | D1 transaction tests simulating failure and verifying rollback.       | Active Candidate   |
| **DAC-SEC-05** | Export Sanitization  | CSV exports of clinical incident lists prepend an apostrophe (`'`) to any text field beginning with spreadsheet formula triggers (`=`, `+`, `-`, `@`).                                                 | Unit tests on CSV export serialization.                               | Active Candidate   |
