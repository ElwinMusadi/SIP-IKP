# Workflow State Machine

## 1. Authority and classification

This document preserves the early proposed workflow analysis. **`FINAL-WORKFLOW.md` is the current implementation authority.** Phase 16 supersedes the provisional BIRU/HIJAU transitions below with this active decision point:

```text
UNDER_REVIEW + BIRU/HIJAU
        ↓
Simple Investigation?
├── YES → SIMPLE_INVESTIGATION → COMPLETED_BY_UNIT
└── NO  → COMPLETED_BY_UNIT
```

The NO path creates no investigation record and emits `REPORT_COMPLETED` only. The YES transition creates the investigation record and uses the existing completion flow. Both actions require the current `If-Match` / `row_version`. KUNING/MERAH remains on the PMKP path. No schema or audit taxonomy change is introduced.

- **Existing requirement:** reporters submit incidents; Kepala Ruangan receives and grades them; BIRU/HIJAU require simple investigation; KUNING/MERAH require initial mitigation and escalation; PMKP may request revision, regrade, and complete; very minor KNC may be completed by unit.
- **Architectural inference:** a single persisted `status` should represent responsibility and lifecycle, while risk grade, review decision, and RCA requirement remain separate attributes/events.
- **Recommendation:** use the state set below and reject every transition not explicitly listed.
- **Stakeholder decision required:** objective eligibility for `COMPLETED_BY_UNIT`, treatment of RCA after PMKP review, cancellation/void/reopen authority, and whether PMKP may regrade to BIRU.

Until those stakeholder decisions are approved, the paths marked conditional must not be exposed as production commands.

## 2. Canonical states

| State                  | Meaning                                                                                  | Operational owner                | Allowed actions                                                                           | Required preconditions                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `DRAFT`                | Report exists but has not been formally submitted.                                       | Creating `TENAGA_KESEHATAN`      | Edit, save, submit; abandonment remains disabled pending lifecycle policy                 | Active registered reporter; ownership matches                                                      |
| `SUBMITTED`            | Official report has been received by the system and clinical event fields are locked.    | IBS review queue                 | Receive for review                                                                        | Submit validation passed; overdue reason present when required; immutable snapshot captured        |
| `UNDER_REVIEW`         | Kepala Ruangan has acknowledged responsibility and is reviewing the report.              | Assigned/scoped `KEPALA_RUANGAN` | Grade; record review notes                                                                | Explicit assigned organizational scope covers owning unit; active reviewer; receipt event recorded |
| `SIMPLE_INVESTIGATION` | BIRU/HIJAU grade is established and unit investigation is being prepared.                | Scoped `KEPALA_RUANGAN`          | Save versioned investigation; submit to PMKP; conditional complete by unit                | Grade is BIRU/HIJAU; investigation validation applies                                              |
| `SUBMITTED_TO_PMKP`    | Simple investigation is formally submitted for PMKP review.                              | `KOMITE_PMKP` queue              | Begin PMKP review                                                                         | Approved investigation version exists; BR-08 valid; attribution captured                           |
| `ESCALATED_TO_PMKP`    | KUNING/MERAH report is formally escalated with initial mitigation.                       | `KOMITE_PMKP` queue              | Begin PMKP review                                                                         | Grade is KUNING/MERAH; mitigation note exists                                                      |
| `PMKP_REVIEW`          | PMKP has acknowledged and is evaluating the current package.                             | Assigned/scoped `KOMITE_PMKP`    | Regrade; request revision; record RCA decision; complete only when decision table permits | PMKP scope grants access; package/version fixed for review                                         |
| `REVISION_REQUIRED`    | PMKP has rejected the current simple-investigation version and issued formal directives. | Scoped `KEPALA_RUANGAN`          | Create next investigation revision; resubmit                                              | Formal revision request and requested-field scope exist                                            |
| `COMPLETED`            | PMKP has formally closed the incident workflow. Terminal by default.                     | PMKP/system record               | Read; append approved addendum; print/export if authorized                                | PMKP completion decision and required attribution exist                                            |
| `COMPLETED_BY_UNIT`    | A formally eligible very minor KNC is closed by unit. Terminal by default.               | Unit/system record               | Read; append approved addendum; PMKP oversight if policy requires                         | Formal eligibility policy satisfied; Kepala Ruangan attribution captured                           |

## 3. Values evaluated but not persisted as standalone states

| Candidate         | Decision                          | Rationale                                                                                                                                                                |
| ----------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RISK_GRADED`     | Do not persist as a durable state | Grading is an atomic command/event. Its grade determines the immediate next state; a durable intermediary creates an actionable limbo.                                   |
| `RESUBMITTED`     | Do not persist as a durable state | Resubmission is an event/version boundary. The report returns to `SUBMITTED_TO_PMKP`; history records `INVESTIGATION_RESUBMITTED`.                                       |
| `RCA_IN_PROGRESS` | Deferred                          | Blueprint calls RCA a PMKP decision but places the RCA module post-MVP. Store a decision attribute/event in MVP; add a state only when RCA lifecycle requirements exist. |
| `ON_HOLD`         | Rejected for current scope        | No baseline actor, reason, SLA effect, or exit condition. Notes/tasks must not silently stop workflow.                                                                   |
| `CANCELLED`       | Stakeholder decision required     | May be needed only for an unsubmitted draft intentionally abandoned. Prefer draft expiry/abandonment metadata rather than a clinical terminal state.                     |
| `VOID`            | Stakeholder decision required     | Potentially necessary for duplicate/wrong-patient reports after submission, but requires policy, high authority, reason, and preserved record. Never hard-delete.        |
| `REOPENED`        | Stakeholder decision required     | No baseline reopen policy. If approved later, reopening must create an event and route to a defined review state without changing historical completion evidence.        |

## 4. Canonical transition matrix

| Current State          | Action                                | Actor                     | Condition                                                                                                                                             | Next State             |
| ---------------------- | ------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `DRAFT`                | `SUBMIT_REPORT`                       | Owning `TENAGA_KESEHATAN` | All submit-time fields valid; incident timestamp valid; overdue reason required when `submitted_at > incident_at + 48h`; confirmation/intent captured | `SUBMITTED`            |
| `SUBMITTED`            | `RECEIVE_REPORT`                      | Scoped `KEPALA_RUANGAN`   | Report belongs to authorized unit; not already received; actor active                                                                                 | `UNDER_REVIEW`         |
| `UNDER_REVIEW`         | `ASSIGN_LOW_RISK_GRADE`               | Scoped `KEPALA_RUANGAN`   | Grade is BIRU or HIJAU; grading attribution recorded                                                                                                  | `SIMPLE_INVESTIGATION` |
| `UNDER_REVIEW`         | `ASSIGN_HIGH_RISK_GRADE_AND_ESCALATE` | Scoped `KEPALA_RUANGAN`   | Grade is KUNING or MERAH; initial mitigation note valid in same transaction                                                                           | `ESCALATED_TO_PMKP`    |
| `SIMPLE_INVESTIGATION` | `SUBMIT_INVESTIGATION`                | Scoped `KEPALA_RUANGAN`   | Current investigation version complete; end date >= start date; recommendations/actions valid; approval intent captured                               | `SUBMITTED_TO_PMKP`    |
| `SIMPLE_INVESTIGATION` | `COMPLETE_BY_UNIT`                    | Scoped `KEPALA_RUANGAN`   | **DISABLED / STAKEHOLDER DECISION REQUIRED:** objective KNC-minor criteria, evidence, and oversight are not approved                                  | `COMPLETED_BY_UNIT`    |
| `SUBMITTED_TO_PMKP`    | `RECEIVE_PMKP_REVIEW`                 | Scoped `KOMITE_PMKP`      | Current submitted package/version is accessible and not claimed incompatibly                                                                          | `PMKP_REVIEW`          |
| `ESCALATED_TO_PMKP`    | `RECEIVE_PMKP_REVIEW`                 | Scoped `KOMITE_PMKP`      | Mitigation package is accessible and not claimed incompatibly                                                                                         | `PMKP_REVIEW`          |
| `PMKP_REVIEW`          | `REQUEST_REVISION`                    | Scoped `KOMITE_PMKP`      | Applies to incomplete simple investigation; formal directives and field scope supplied                                                                | `REVISION_REQUIRED`    |
| `REVISION_REQUIRED`    | `RESUBMIT_INVESTIGATION`              | Scoped `KEPALA_RUANGAN`   | A new immutable investigation version satisfies directives and validation                                                                             | `SUBMITTED_TO_PMKP`    |
| `PMKP_REVIEW`          | `COMPLETE_REPORT`                     | Scoped `KOMITE_PMKP`      | Completeness = YA; further RCA = TIDAK; any regrade consequences resolved; completion intent captured                                                 | `COMPLETED`            |

### PMKP decision table

| Investigation complete | Further RCA required | Permitted result                                            | Notes                                                                                            |
| ---------------------- | -------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| TIDAK                  | Any/undecided        | `REQUEST_REVISION` only for the simple-investigation branch | Formal directives and field scope are mandatory                                                  |
| YA                     | TIDAK                | `COMPLETE_REPORT` after any regrade consequence is resolved | Produces `COMPLETED`                                                                             |
| YA                     | YA                   | **BLOCKED — stakeholder decision required**                 | Must enter an approved RCA handoff/lifecycle; it may not be completed as if RCA were unnecessary |
| Undecided              | Any                  | No terminal transition                                      | Save review draft only                                                                           |

For KUNING/MERAH cases, `ESCALATED_TO_PMKP → PMKP_REVIEW` is valid, but a further-RCA = YA decision currently has no approved next state because interactive RCA is post-MVP. The architecture must not invent a terminal/handoff state. Until stakeholders select an RCA model, the affected production transition remains disabled. This is an explicit Phase 03 blocker, not a dead-end implementation instruction.

### PMKP regrading semantics

Regrading is an audited decision and never deletes the initial grade. Blueprint allows HIJAU/KUNING/MERAH and omits BIRU. The following consequences are **not approved** and block regrade commands that cross branches:

- low-risk to KUNING/MERAH: decide whether it immediately requires mitigation/escalation or an RCA handoff;
- high-risk to HIJAU: decide whether a new simple investigation is mandatory before completion;
- any regrade to BIRU: not permitted by current Blueprint wording.

Until stakeholders approve these semantics, PMKP may record a proposed regrade in a review draft, but the system must not finalize a branch-changing regrade or complete the case.

## 5. Forbidden transitions

All unlisted transitions are forbidden. Critical examples:

- `DRAFT` directly to `UNDER_REVIEW`, grading, PMKP, or completion.
- “Abandon draft” is not an active command until expiry/restoration/disposition policy is approved; drafts remain `DRAFT`.
- `SUBMITTED` back to editable `DRAFT`.
- `SUBMITTED` directly to any completion state.
- `UNDER_REVIEW` directly to PMKP without a grade and branch-specific required data.
- BIRU/HIJAU directly to `ESCALATED_TO_PMKP` without an explicitly approved exception.
- KUNING/MERAH to `SIMPLE_INVESTIGATION` as the normal path.
- `REVISION_REQUIRED` to `COMPLETED` without a new submission and PMKP review.
- Any role other than PMKP setting `COMPLETED`.
- Any role other than an authorized Kepala Ruangan setting `COMPLETED_BY_UNIT`.
- Any update of the submitted clinical event snapshot. Corrections use addenda.
- Any transition out of a completion state until a formal reopen/void policy is approved.

## 6. Ownership, concurrency, and atomicity

Each command must be authorized and validated server-side using role, unit scope, ownership, current state, current version, and active-account status. The client is not a security boundary.

State-changing requests must include an expected record version. A stale version returns `409 CONFLICT`. The following must commit atomically in D1:

1. domain mutation/version insertion;
2. status transition;
3. attribution snapshot where required;
4. audit event;
5. outbox/task metadata if introduced later.

## 7. Revision and addendum interaction

- Revision changes the current **investigation package**, not the locked clinical event snapshot.
- Addendum appends information to a submitted or completed report; it never edits original chronology.
- PMKP directives and every investigation version remain readable in chronological history.
- Completion freezes workflow decision records, but an authorized addendum may be appended if policy permits. Whether post-completion addenda require renewed review is a stakeholder decision.

## 8. Stakeholder decisions required before production

1. Objective definition, evidence, and PMKP oversight for “KNC sangat minor” and `COMPLETED_BY_UNIT`.
2. Whether submitted reports can be marked `VOID`, by whom, and under what reasons.
3. Whether completed cases can be `REOPENED`, their destination state, and whether prior completion remains valid evidence.
4. Whether PMKP can regrade to BIRU.
5. Whether RCA needs an MVP state or remains a recorded decision pending a post-MVP module.
6. Whether post-completion addendum triggers a PMKP notification or reopen process.

## 9. Related requirements

- FR-02, FR-03, FR-04, FR-05, FR-06
- BR-01, BR-03, BR-04, BR-05, BR-06, BR-07, BR-08, BR-09
- AC-01 through AC-05 are referenced collectively in the Blueprint; the document does not map individual IDs to individual acceptance statements.
