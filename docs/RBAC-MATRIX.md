# RBAC Matrix

## 1. Authorization model

The recommended authorization model is **RBAC plus scoped attributes and workflow policy**:

```text
allow = active account
    AND role permits action
    AND organizational scope permits resource
    AND ownership/assignment permits resource when applicable
    AND current state permits action
    AND field policy permits mutation
```

Backend Pages Functions and D1 queries are the security boundary. Route hiding, disabled buttons, and client guards improve UX only.

### Scope terms

- `OWN`: resource created by the authenticated user.
- `UNIT`: resource belongs to a unit assignment authorized for the actor.
- `IBS`: resource belongs to the IBS deployment scope.
- `PMKP_SCOPE`: units explicitly assigned to the PMKP actor. Hospital-wide scope is not assumed until approved.
- `SYSTEM_ADMIN`: account/master-data scope, not automatic clinical-record access.

Every account needs explicit unit assignment. Free-text `unit_name` is insufficient as an authorization source.

## 2. Canonical matrix

| Role               | Resource                  | Action                                | Scope                      | Preconditions                                                                                                                    |
| ------------------ | ------------------------- | ------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `TENAGA_KESEHATAN` | Incident report           | Create draft                          | `OWN` within assigned unit | Active account; registered healthcare worker                                                                                     |
| `TENAGA_KESEHATAN` | Incident report           | Read                                  | `OWN`                      | Report was created by actor; no deleted/void hiding policy bypass                                                                |
| `TENAGA_KESEHATAN` | Incident report           | Edit                                  | `OWN`                      | State is `DRAFT`; field allowed at draft stage                                                                                   |
| `TENAGA_KESEHATAN` | Incident report           | Submit                                | `OWN`                      | State `DRAFT`; submit validation and confirmation passed                                                                         |
| `TENAGA_KESEHATAN` | Addendum                  | Create                                | `PENDING POLICY`           | Disabled until authorship, lifecycle state, approval, and notification rules are approved                                        |
| `TENAGA_KESEHATAN` | Formal output             | View/print/download own report        | `OWN`                      | Output permission enabled; output event audited; confidentiality controls applied                                                |
| `KEPALA_RUANGAN`   | Incident report           | List/read                             | `ASSIGNED_ORG_SCOPE`       | Active managerial assignment explicitly covers the report's owning unit or approved IBS subtree                                  |
| `KEPALA_RUANGAN`   | Incident report           | Receive                               | `ASSIGNED_ORG_SCOPE`       | State `SUBMITTED`; expected version current                                                                                      |
| `KEPALA_RUANGAN`   | Incident report           | Assign initial risk grade             | `ASSIGNED_ORG_SCOPE`       | State `UNDER_REVIEW`; actor is not relying on client-only access                                                                 |
| `KEPALA_RUANGAN`   | Incident report           | Add high-risk mitigation and escalate | `ASSIGNED_ORG_SCOPE`       | State `UNDER_REVIEW`; grade KUNING/MERAH; mitigation present                                                                     |
| `KEPALA_RUANGAN`   | Investigation             | Create/edit current revision          | `ASSIGNED_ORG_SCOPE`       | State `SIMPLE_INVESTIGATION` or `REVISION_REQUIRED`; grade branch allows it                                                      |
| `KEPALA_RUANGAN`   | Investigation             | Submit/resubmit                       | `ASSIGNED_ORG_SCOPE`       | Version complete; BR-08 valid; confirmation captured                                                                             |
| `KEPALA_RUANGAN`   | Incident report           | Complete by unit                      | `PENDING POLICY`           | Disabled until objective KNC-minor criteria, evidence, and oversight are approved                                                |
| Any clinical role  | Addendum                  | Create                                | `PENDING POLICY`           | Disabled until authorship, lifecycle state, approval, and notification rules are approved                                        |
| `KEPALA_RUANGAN`   | Dashboard                 | View unit aggregates                  | `ASSIGNED_ORG_SCOPE`       | Aggregate/query constrained to explicit assignment                                                                               |
| `KOMITE_PMKP`      | Incident report/package   | List/read                             | `PMKP_SCOPE`               | Scope approved and enforced in query; hospital-wide access not assumed                                                           |
| `KOMITE_PMKP`      | PMKP review               | Receive/start review                  | `PMKP_SCOPE`               | State `SUBMITTED_TO_PMKP` or `ESCALATED_TO_PMKP`                                                                                 |
| `KOMITE_PMKP`      | PMKP review               | Evaluate completeness/RCA need        | `PMKP_SCOPE`               | State `PMKP_REVIEW`; current package version fixed                                                                               |
| `KOMITE_PMKP`      | Incident report           | Regrade                               | `PMKP_SCOPE`               | State `PMKP_REVIEW`; allowed grade set; reason captured                                                                          |
| `KOMITE_PMKP`      | Investigation             | Request revision                      | `PMKP_SCOPE`               | State `PMKP_REVIEW`; revision directives and field scope present                                                                 |
| `KOMITE_PMKP`      | Incident report           | Complete                              | `PMKP_SCOPE`               | State `PMKP_REVIEW`; completeness = YA; further RCA = TIDAK; branch-changing regrade consequence resolved; confirmation complete |
| `KOMITE_PMKP`      | Addendum                  | Create                                | `PENDING POLICY`           | Disabled until authorship, lifecycle state, approval, and notification rules are approved                                        |
| `KOMITE_PMKP`      | Addendum                  | Read                                  | `PMKP_SCOPE`               | Parent incident read policy allows access                                                                                        |
| `KOMITE_PMKP`      | Dashboard/report/export   | View/export scoped data               | `PMKP_SCOPE`               | Explicit export permission; filters bounded; output audited                                                                      |
| `ADMINISTRATOR`    | User account              | Create/read/update/deactivate         | `SYSTEM_ADMIN`             | Separation-of-duty policy; no self-escalation without oversight                                                                  |
| `ADMINISTRATOR`    | Role/unit assignment      | Assign/revoke                         | `SYSTEM_ADMIN`             | Authorized administrative process; before/after audit snapshot                                                                   |
| `ADMINISTRATOR`    | Master data               | Create/update/deactivate              | `SYSTEM_ADMIN`             | Stable code preserved; historical references not rewritten                                                                       |
| `ADMINISTRATOR`    | Audit operations metadata | Monitor integrity/availability        | `SYSTEM_ADMIN`             | No update/delete to domain audit events                                                                                          |
| `ADMINISTRATOR`    | Clinical incident content | None by default                       | None                       | Requires a separately approved support/break-glass policy; admin role alone is insufficient                                      |

## 3. Field-level policy

| Data group                                                                                                        | `DRAFT`                        | After `SUBMITTED`                                                                            | Revision cycle                           | Completion                                  |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------- |
| Clinical event snapshot: patient data, incident time, title, chronology, classification, impact, immediate action | Owning reporter may edit       | Immutable                                                                                    | Not editable; correction via addendum    | Immutable; correction via addendum          |
| Emergency MR replacement                                                                                          | Editable                       | **Stakeholder-controlled exception** via correction command/addendum, never silent overwrite | Same                                     | Same                                        |
| Workflow metadata: status, assignments, receipt times                                                             | System/authorized command only | Mutable only through transition commands                                                     | Command controlled                       | Frozen except approved reopen/void process  |
| Risk grading                                                                                                      | Not set                        | Kepala Ruangan initial grade                                                                 | PMKP regrading; prior values preserved   | Frozen                                      |
| Investigation current working version                                                                             | Not applicable                 | Kepala Ruangan on BIRU/HIJAU branch                                                          | New version only when revision requested | Frozen                                      |
| PMKP evaluation                                                                                                   | Not applicable                 | PMKP only                                                                                    | New review/revision decision entries     | Frozen                                      |
| Addendum                                                                                                          | Not applicable                 | Append-only by authorized actor                                                              | Append-only                              | Append-only only if approved policy permits |
| Audit event                                                                                                       | Append-only system creation    | Append-only                                                                                  | Append-only                              | Append-only                                 |

## 4. Negative authorization examples

The server must reject these cases even if the client displays a route or an ID is known:

1. `TENAGA_KESEHATAN` reads or edits another reporter's draft.
2. `TENAGA_KESEHATAN` updates any submitted clinical-event field.
3. `TENAGA_KESEHATAN` submits a report created by another user.
4. A Kepala Ruangan accesses an incident outside the actor's explicit assigned organizational scope.
5. A Kepala Ruangan grades a report not in `UNDER_REVIEW`.
6. A Kepala Ruangan escalates KUNING/MERAH without an initial mitigation note.
7. A Kepala Ruangan completes an incident without an approved KNC-minor eligibility rule.
8. PMKP accesses hospital-wide records merely because its role string equals `KOMITE_PMKP`; scope assignment is also required.
9. PMKP overwrites a prior investigation version or original chronology.
10. An Administrator reads clinical chronology or attachments merely because it manages accounts.
11. Any actor changes its own role/unit assignment.
12. Any actor updates or deletes audit events.
13. A deactivated account uses an existing session to perform an action.
14. A stale client overwrites a newer version of a report or investigation.
15. A guessed attachment ID produces a download without report-level read permission.
16. An export request returns rows outside the actor's scope.

## 5. Enforcement rules

- Resolve actor identity and active assignments from server-side session state for every request.
- Express authorization as reusable policy functions; do not duplicate ad hoc `if role` logic in handlers.
- Apply scope predicates in D1 queries before data is returned, not after fetching all rows.
- Return `404` instead of exposing existence where object enumeration is a concern; use `403` when existence disclosure is already safe and authorization semantics matter.
- Audit consequential allow and deny events according to `SECURITY-ARCHITECTURE.md`; never log patient payloads in security logs.
- Test every positive matrix row and negative example at API level.

## 6. Stakeholder decisions required

1. Is PMKP scope IBS-only for MVP or hospital-wide?
2. Can a person hold multiple roles or delegated/time-bounded assignments?
3. Can Administrator access clinical content under break-glass/support conditions? What approval and audit are required?
4. What objective rule permits `COMPLETED_BY_UNIT`?
5. Who may create post-completion addenda?
6. Which actors may print/export, and which fields require masking?
7. How may emergency MR be corrected after submission?

## 7. Related requirements

- FR-01 through FR-07
- BR-01, BR-02, BR-04, BR-05, BR-06, BR-07, BR-08, BR-09
- Blueprint role descriptions at the existing RBAC section
