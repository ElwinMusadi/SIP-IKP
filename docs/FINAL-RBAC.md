# Final Role-Based Access Control (RBAC) Specification (Phase 07 Reconciled)

## 1. Governance Model and Enforcement Policy

This document defines the definitive Role-Based Access Control (RBAC) and data visibility boundary for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**ENFORCEMENT MANDATE:**

1. Authorization is enforced strictly on the server in Cloudflare Pages Functions and D1 query predicates.
2. The authorization model follows:
   ```text
   ALLOW = Authenticated(user)
       AND ActiveAccount(user)
       AND RolePermits(user.role, resource, action)
       AND ScopePermits(user.scope, resource)
       AND ConditionPermits(resource.status, user.id, action)
   ```
3. Default disposition: **STRICT DEFAULT DENY**. Any operation not explicitly granted is rejected with `HTTP 403 Forbidden` or `HTTP 404 Not Found`.

---

## 2. Canonical Roles

- **`TENAGA_KESEHATAN` (Nakes):** Frontline surgical healthcare workers in IBS (Surgeons, Theater Nurses, Anesthesiologists, Nurse Anesthetists, Midwives).
- **`KEPALA_RUANGAN` (Head of Room):** Clinical manager of the Central Surgical Installation (IBS).
- **`KOMITE_PMKP` (Quality Committee):** Hospital Patient Safety & Quality Committee members responsible for oversight of surgical incidents.
- **`ADMINISTRATOR`:** System and IT administrator. Responsible for user management, master data, and operational health.

---

## 3. Comprehensive Domain Permission Matrix

| Resource                 | Action                   | `TENAGA_KESEHATAN`  | `KEPALA_RUANGAN`    | `KOMITE_PMKP`       | `ADMINISTRATOR`      | Scope & Operational Conditions                                                                              |
| ------------------------ | ------------------------ | ------------------- | ------------------- | ------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Incident Draft**       | `CREATE`                 | **ALLOW**           | **ALLOW**           | **ALLOW**           | **DENY**             | Administrator does not create incident drafts. Non-empty minimum draft required.                            |
| Incident Draft           | `READ`                   | **ALLOW (Own)**     | **ALLOW (Own)**     | **ALLOW (Own)**     | **DENY**             | **STRICTLY PRIVATE TO `created_by`.** No user may view another user's draft.                                |
| Incident Draft           | `UPDATE` (Auto-save)     | **ALLOW (Own)**     | **ALLOW (Own)**     | **ALLOW (Own)**     | **DENY**             | Only `created_by` can edit. Status must be `DRAFT` or `REVISION_REQUIRED`.                                  |
| Incident Draft           | `DELETE` (Hard delete)   | **ALLOW (Own)**     | **ALLOW (Own)**     | **ALLOW (Own)**     | **DENY**             | Only `created_by` can delete draft. Executes hard delete in D1. Zero audit retained.                        |
| Incident Draft           | `SUBMIT`                 | **ALLOW (Own)**     | **ALLOW (Own)**     | **ALLOW (Own)**     | **DENY**             | Only `created_by` can submit. Requires all mandatory Bagian I & II Form fields complete.                    |
| **Submitted Incident**   | `READ` (Overview / List) | **ALLOW (All IBS)** | **ALLOW (All IBS)** | **ALLOW (All IBS)** | **DENY (Narrative)** | **Nakes IBS can view submitted reports of other Nakes IBS** (read-only view). Admin denied narrative.       |
| Submitted Incident       | `READ` (Detail)          | **ALLOW (All IBS)** | **ALLOW (All IBS)** | **ALLOW (All IBS)** | **DENY (Narrative)** | Clinical narrative (chronology, patient PII) denied to `ADMINISTRATOR` by default.                          |
| Submitted Incident       | `RECEIVE`                | **DENY**            | **ALLOW**           | **DENY**            | **DENY**             | Only Kepala Ruangan IBS can advance `SUBMITTED` -> `UNDER_REVIEW`.                                          |
| Submitted Incident       | `REQUEST_REVISION`       | **DENY**            | **ALLOW**           | **DENY**            | **DENY**             | Only Kepala Ruangan IBS can request revision (`UNDER_REVIEW` -> `REVISION_REQUIRED`).                       |
| Submitted Incident       | `RESUBMIT`               | **ALLOW (Own)**     | **ALLOW (Own)**     | **ALLOW (Own)**     | **DENY**             | Only `created_by` can resubmit report. Status must be `REVISION_REQUIRED`.                                  |
| **Risk Grading**         | `ASSIGN_GRADE`           | **DENY**            | **ALLOW**           | **DENY**            | **DENY**             | Only Kepala Ruangan IBS assigns initial grade (`BIRU`, `HIJAU`, `KUNING`, `MERAH`).                         |
| Risk Grading             | `REGRADE` (Separate)     | **DENY**            | **DENY**            | **DENY**            | **DENY**             | **No separate regrade in MVP.** Grade changes occur via Emergency Correction only.                          |
| **Emergency Correction** | `EXECUTE_CORRECTION`     | **DENY**            | **ALLOW**           | **DENY**            | **DENY**             | **Actor strictly Kepala Ruangan IBS.** Allowed ONLY during `SUBMITTED` or `UNDER_REVIEW`. Reason mandatory. |
| **Simple Investigation** | `FILL_WORKSHEET`         | **DENY**            | **ALLOW**           | **DENY**            | **DENY**             | Form page 3 fields filled exclusively by Kepala Ruangan IBS in `SIMPLE_INVESTIGATION`.                      |
| Simple Investigation     | `COMPLETE`               | **DENY**            | **ALLOW**           | **DENY**            | **DENY**             | Kepala Ruangan IBS completes investigation -> transitions to `COMPLETED_BY_UNIT` (Terminal).                |
| **PMKP Review**          | `UPDATE_NOTE`            | **DENY**            | **DENY**            | **ALLOW**           | **DENY**             | PMKP review note updated while `pmkp_reviewed = false` in `PMKP_REVIEW`.                                    |
| PMKP Review              | `FINALIZE_RCA_HANDOFF`   | **DENY**            | **ALLOW**           | **ALLOW**           | **DENY**             | External RCA handoff finalized by PMKP or Kepala Ruangan -> `COMPLETED` (Terminal).                         |
| **Audit Trail**          | `READ_TIMELINE`          | **ALLOW**           | **ALLOW**           | **ALLOW**           | **ALLOW (Meta)**     | Viewable by any user with report access. Displays event/action only (no old/new diffs).                     |
| Audit Trail              | `EXPORT_PDF`             | **ALLOW**           | **ALLOW**           | **ALLOW**           | **DENY**             | Export PDF only. Export is NOT an audit event. Minimal PDF header.                                          |
| **User Management**      | `MANAGE_USERS`           | **DENY**            | **DENY**            | **DENY**            | **ALLOW**            | Account creation, deactivation, password reset initiation strictly `ADMINISTRATOR`.                         |
| **Master Data**          | `MANAGE_MASTER`          | **DENY**            | **DENY**            | **DENY**            | **ALLOW**            | Operating rooms, specializations, departments, payer types managed by `ADMINISTRATOR`.                      |

---

## 4. Special Visibility and Security Rules

### 4.1 Peer Visibility for Nakes IBS

In prior drafts, Nakes were strictly limited to viewing their own reports. In accordance with **Decision Workshop (#1–#188)**:

- Frontline Nakes IBS **can view submitted reports of other Nakes IBS** in the IBS incident list and read the details.
- This visibility supports clinical shared learning and non-punitive quality awareness across operating teams.
- **Strict Boundary:** Visibility confers **ZERO editing, revision, grading, or workflow authority** over peer reports. Peer reports are strictly read-only.
- **Draft Exemption:** Drafts are **NOT** shared. Drafts remain 100% private to the `created_by` author until formally submitted.

### 4.2 Administrator Clinical Privacy Boundary

To protect patient confidentiality and uphold medical record privacy:

- The `ADMINISTRATOR` role manages technical accounts, role assignments, system master data, and operational server health.
- The `ADMINISTRATOR` role is **STRICTLY DENIED** access to clinical narratives (`chronology`, `immediate_action_and_result`, direct/root causes) and patient PII (`patient_name`, `medical_record_number`) in query responses.
- If an administrator queries incident APIs, clinical narrative fields are stripped or return `403 Forbidden`.

### 4.3 Draft Ownership and Creator Autonomy

- `created_by` (the authenticated user creating the record) and `reporter` (the staff member named as the reporter on Form Bagian II) can be different individuals (e.g. an anesthesiologist creating a report on behalf of an operating theater team).
- Only `created_by` holds workflow authority over the draft:
  - Only `created_by` can edit draft fields.
  - Only `created_by` can execute `SUBMIT_REPORT`.
  - Only `created_by` can execute `DELETE_DRAFT` (hard delete).
  - Only `created_by` can edit and resubmit if returned under `REVISION_REQUIRED`.
- Drafts cannot be reassigned to other users in MVP.
