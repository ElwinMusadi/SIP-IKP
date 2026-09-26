# Canonical Role-Based Access Control (RBAC) Matrix

## 1. Governance Model and Enforcement Policy

This document defines the canonical authorization boundary for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**ENFORCEMENT MANDATE:**
Authorization is evaluated on the server in Cloudflare Pages Functions and D1 query predicates. Client-side route guards, hidden buttons, and disabled UI controls are strictly non-authoritative UX aids.

Authorization is evaluated as a multi-dimensional predicate:

```text
ALLOW = Authenticated(user)
    AND ActiveAccount(user)
    AND RolePermits(user.role, resource, action)
    AND UnitScopePermits(user.unit_assignments, resource.owning_unit_id)
    AND OwnershipPermits(user.id, resource.created_by_user_id) [where applicable]
    AND StatePermits(resource.lifecycle_status, action)
    AND FieldPolicyPermits(action, target_fields)
```

Default disposition: **DENY ALL** unless an explicit matching rule grants access.

---

## 2. Canonical Roles

- **`TENAGA_KESEHATAN`:** Registered frontline healthcare worker (Dokter, Perawat Bedah, Penata Anestesi, Bidan). Creator of drafts, submitter of official reports, and recipient of personal report status.
- **`KEPALA_RUANGAN`:** Clinical ward/unit supervisor (Kepala Ruangan IBS). Reviewer of submitted reports, verifier of receipt, assigner of risk grades, investigator of simple incidents, and authorizer of unit submissions.
- **`KOMITE_PMKP`:** Hospital Quality & Patient Safety Committee member. Oversight evaluator of investigations, regrading authority, issuer of revision directives, and final closure authority.
- **`ADMINISTRATOR`:** Technical system administrator. Manager of staff accounts, role/unit assignments, system master data, and operational audit log integrity.

---

## 3. Comprehensive Domain Resource Authorization Matrix

| Domain Resource          | Action              | Role                 | Evaluation Result      | Scope Rule              | Precondition & Governance Rule                                                                                        |
| ------------------------ | ------------------- | -------------------- | ---------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Incident Report**      | `CREATE` (Draft)    | `TENAGA_KESEHATAN`   | **ALLOW**              | Own unit                | Registered healthcare worker account active (`BR-01`).                                                                |
| Incident Report          | `CREATE` (Draft)    | Other Roles          | **DENY**               | -                       | Administrators, Unit Heads, and PMKP members do not create reports unless acting under an assigned reporter identity. |
| Incident Report          | `READ` (Detail)     | `TENAGA_KESEHATAN`   | **ALLOW**              | `OWN` only              | Can only read reports created by self (`created_by_user_id == current_user_id`).                                      |
| Incident Report          | `READ` (Detail)     | `KEPALA_RUANGAN`     | **ALLOW**              | `ASSIGNED_UNIT` (`IBS`) | Can read reports whose `owning_unit_id` matches active assignment.                                                    |
| Incident Report          | `READ` (Detail)     | `KOMITE_PMKP`        | **ALLOW**              | `PMKP_SCOPE`            | Can read reports within assigned committee oversight scope.                                                           |
| Incident Report          | `READ` (Detail)     | `ADMINISTRATOR`      | **DENY (Provisional)** | None                    | **Zero default access to clinical narratives.** Administrative metadata only (`DM-036`).                              |
| Incident Report          | `UPDATE` (Draft)    | `TENAGA_KESEHATAN`   | **ALLOW**              | `OWN` only              | Status must be `DRAFT`. Locked post-submission (`BR-04`).                                                             |
| Incident Report          | `UPDATE` (Draft)    | Other Roles          | **DENY**               | -                       | Direct editing of draft content forbidden to non-authors.                                                             |
| Incident Report          | `DELETE` (Draft)    | `TENAGA_KESEHATAN`   | **PENDING POLICY**     | `OWN` only              | Abandoning drafts disabled pending retention/disposition policy (`DM-018`).                                           |
| Incident Report          | `SUBMIT`            | `TENAGA_KESEHATAN`   | **ALLOW**              | `OWN` only              | Status `DRAFT`; all required fields valid; confirmation signed.                                                       |
| Incident Report          | `RECEIVE`           | `KEPALA_RUANGAN`     | **ALLOW**              | `ASSIGNED_UNIT`         | Status must be `SUBMITTED`; records receipt timestamp.                                                                |
| **Submission Snapshot**  | `READ`              | Clinical Roles       | **ALLOW**              | Scoped per Incident     | Matches parent incident read authorization.                                                                           |
| Submission Snapshot      | `UPDATE` / `DELETE` | All Roles            | **DENY**               | -                       | **PERMANENTLY LOCKED & IMMUTABLE** post-submission (`BR-04`).                                                         |
| **Risk Decision**        | `GRADE_INITIAL`     | `KEPALA_RUANGAN`     | **ALLOW**              | `ASSIGNED_UNIT`         | Status must be `UNDER_REVIEW`; Biru/Hijau/Kuning/Merah.                                                               |
| Risk Decision            | `GRADE_INITIAL`     | Other Roles          | **DENY**               | -                       | Initial grading is strictly reserved for the unit head (`FR-03`).                                                     |
| Risk Decision            | `REGRADE`           | `KOMITE_PMKP`        | **CONDITIONAL**        | `PMKP_SCOPE`            | Status must be `PMKP_REVIEW`; Hijau/Kuning/Merah. Branch-changing regrades BLOCKED (`DM-007`).                        |
| Risk Decision            | `REGRADE`           | Other Roles          | **DENY**               | -                       | Regrading is strictly reserved for PMKP (`FR-05`).                                                                    |
| **Simple Investigation** | `CREATE` / `EDIT`   | `KEPALA_RUANGAN`     | **ALLOW**              | `ASSIGNED_UNIT`         | Status `SIMPLE_INVESTIGATION` or `REVISION_REQUIRED`; Biru/Hijau.                                                     |
| Simple Investigation     | `SUBMIT` to PMKP    | `KEPALA_RUANGAN`     | **ALLOW**              | `ASSIGNED_UNIT`         | Status `SIMPLE_INVESTIGATION` or `REVISION_REQUIRED`; `end >= start` (`BR-08`).                                       |
| Simple Investigation     | `APPROVE` (Unit)    | `KEPALA_RUANGAN`     | **ALLOW**              | `ASSIGNED_UNIT`         | Head approval attribution captured atomically.                                                                        |
| Simple Investigation     | Any Action          | Other Roles          | **DENY**               | -                       | Simple investigation worksheet belongs strictly to unit head (`FR-04`).                                               |
| **PMKP Review Cycle**    | `REVIEW_INTAKE`     | `KOMITE_PMKP`        | **ALLOW**              | `PMKP_SCOPE`            | Status `SUBMITTED_TO_PMKP` or `ESCALATED_TO_PMKP`.                                                                    |
| PMKP Review Cycle        | `REQUEST_REVISION`  | `KOMITE_PMKP`        | **ALLOW**              | `PMKP_SCOPE`            | Status `PMKP_REVIEW`; simple investigation branch; `complete = TIDAK`.                                                |
| PMKP Review Cycle        | `COMPLETE_CASE`     | `KOMITE_PMKP`        | **ALLOW**              | `PMKP_SCOPE`            | Status `PMKP_REVIEW`; `complete = YA`; `further_rca = TIDAK`.                                                         |
| **Unit Completion**      | `COMPLETE_BY_UNIT`  | `KEPALA_RUANGAN`     | **DISABLED**           | `ASSIGNED_UNIT`         | **DISABLED / PENDING POLICY (`DM-005`):** KNC minor policy unapproved.                                                |
| **Incident Addendum**    | `CREATE`            | Clinical Roles       | **PENDING POLICY**     | Scoped                  | **PENDING POLICY (`DM-011`):** Authorship and state gates unapproved.                                                 |
| Incident Addendum        | `READ`              | Clinical Roles       | **ALLOW**              | Scoped                  | Inherits parent incident read permission.                                                                             |
| Incident Addendum        | `UPDATE` / `DELETE` | All Roles            | **DENY**               | -                       | Append-only; zero mutation of existing addenda allowed.                                                               |
| **Correction Request**   | `REQUEST` (No. MR)  | `KEPALA_RUANGAN`     | **PENDING POLICY**     | `ASSIGNED_UNIT`         | **PENDING GOVERNANCE (`DM-012`):** Correction workflow unapproved.                                                    |
| Correction Request       | `APPROVE` (No. MR)  | `KOMITE_PMKP`        | **PENDING POLICY**     | `PMKP_SCOPE`            | **PENDING GOVERNANCE (`DM-012`):** Correction workflow unapproved.                                                    |
| **Attachments**          | `UPLOAD` / `DELETE` | Clinical Roles       | **CONDITIONAL**        | Scoped                  | **CONDITIONAL (`DM-016`):** Attachment feature deferred from MVP.                                                     |
| Attachments              | `DOWNLOAD`          | Clinical Roles       | **CONDITIONAL**        | Scoped                  | Authorized short-lived download URL only if attachment is approved.                                                   |
| **Audit Records**        | `READ` (Timeline)   | `KEPALA_RUANGAN`     | **ALLOW**              | `ASSIGNED_UNIT`         | Read-only unit audit events; sensitive diffs minimized.                                                               |
| Audit Records            | `READ` (Timeline)   | `KOMITE_PMKP`        | **ALLOW**              | `PMKP_SCOPE`            | Read-only hospital audit events.                                                                                      |
| Audit Records            | `READ` (System)     | `ADMINISTRATOR`      | **ALLOW**              | Global metadata         | Technical/integrity metadata only; zero clinical narrative access.                                                    |
| Audit Records            | `INSERT` (Direct)   | All Roles            | **DENY**               | -                       | Application code generates audit records; zero direct user insert.                                                    |
| Audit Records            | `UPDATE` / `DELETE` | All Roles            | **DENY**               | -                       | **STRICTLY FORBIDDEN:** Audit trail is append-only (`FR-06`, `ADR-007`).                                              |
| **Master Data**          | `READ`              | All Roles            | **ALLOW**              | Global                  | Operating rooms, specializations, units, payer types.                                                                 |
| Master Data              | `MANAGE` (CRUD)     | `ADMINISTRATOR`      | **ALLOW**              | Global                  | Stable codes maintained; deactivation preferred over deletion.                                                        |
| **User Accounts**        | `MANAGE` (CRUD)     | `ADMINISTRATOR`      | **ALLOW**              | Global                  | Account creation, deactivation, password reset initiation.                                                            |
| User Accounts            | `MANAGE`            | Other Roles          | **DENY**               | -                       | User management strictly reserved for `ADMINISTRATOR`.                                                                |
| **Reporting / Export**   | `EXPORT_CSV`        | `KOMITE_PMKP`        | **ALLOW**              | `PMKP_SCOPE`            | Authorized aggregate export; formula injection protected.                                                             |
| Reporting / Export       | `PRINT_PDF`         | Reporter, Head, PMKP | **ALLOW**              | Scoped                  | Formal Form IKP PDF layout (`/cetak`); attribution stempel printed.                                                   |
| Reporting / Export       | Any Export          | `ADMINISTRATOR`      | **DENY (Provisional)** | None                    | Prohibited from exporting clinical patient incident data (`DM-036`).                                                  |

---

## 4. Organizational Scope Enforcement Rules

1. **`OWN` Scope:** Evaluated as `incident.created_by_user_id == current_user.id`.
2. **`ASSIGNED_UNIT` Scope:** Evaluated as `incident.owning_unit_id IN (SELECT unit_id FROM user_unit_assignments WHERE user_id == current_user.id AND is_active == 1)`.
3. **`PMKP_SCOPE`:** Evaluated as explicit organizational authorization grants. Does not grant automatic cross-hospital access unless formal multi-unit scope is approved (`ADR-001`).
4. **IDOR / BOLA Prevention:** Any query requesting an incident by ID where the user does not have `OWN`, `ASSIGNED_UNIT`, or `PMKP_SCOPE` must return `HTTP 404 Not Found` (to conceal the record's existence) or `HTTP 403 Forbidden`.
