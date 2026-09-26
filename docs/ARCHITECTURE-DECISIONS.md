# Architecture Decisions

## 1. Purpose

This is the Phase 02 architecture decision baseline for SIP-IKP. It converts the Product Blueprint and Architecture Audit into reviewable proposals before D1 schema design.

No ADR is `ACCEPTED`. ADRs marked `PROPOSED` are technical recommendations for review, not hospital policy or legal approval. Items marked `STAKEHOLDER DECISION REQUIRED` block the affected implementation path. Every ADR includes pending governance metadata that must be completed by named authorities before status changes.

## 2. Decision register

| ADR     | Decision                                                                                           | Status                        | Phase 03 effect                                                                   |
| ------- | -------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| ADR-001 | IBS-first, multi-unit-capable architecture; production scope approval pending                      | STAKEHOLDER DECISION REQUIRED | Organization/unit keys may be designed; cross-unit grants blocked                 |
| ADR-002 | Canonical workflow and explicit command transitions                                                | PROPOSED                      | Core status/check constraints may be designed after approval of conditional paths |
| ADR-003 | RBAC plus unit/ownership/status/field policies; backend boundary                                   | PROPOSED                      | Role assignments and scoped query model can be designed                           |
| ADR-004 | Server-side opaque sessions preferred over stateless JWT                                           | STAKEHOLDER DECISION REQUIRED | Session schema blocked pending Blueprint deviation approval                       |
| ADR-005 | Server-side authoritative drafts; no patient data in browser persistence                           | PROPOSED                      | Draft lifecycle fields may be designed; expiry period pending                     |
| ADR-006 | Submitted clinical snapshot immutable; append-only addenda; versioned revisions                    | PROPOSED                      | Incident/addendum/revision entities can be designed                               |
| ADR-007 | No integrity level selected; restricted append-only proposed, hash chain/external sink optional    | STAKEHOLDER DECISION REQUIRED | Base audit event shape may be explored; assurance-specific fields pending         |
| ADR-008 | Implement attribution/approval evidence, not unproven legal signature                              | STAKEHOLDER DECISION REQUIRED | Attribution snapshots may be modeled; legal labels/assurance blocked              |
| ADR-009 | UTC storage, Asia/Makassar display, strict `>48h` overdue formula                                  | PROPOSED                      | Timestamp and SLA columns can be designed                                         |
| ADR-010 | Defer attachments unless confirmed for MVP                                                         | STAKEHOLDER DECISION REQUIRED | Attachment schema should be excluded or isolated until decision                   |
| ADR-011 | Lifecycle-ready design without invented retention periods                                          | STAKEHOLDER DECISION REQUIRED | No deletion jobs/period constraints until policy                                  |
| ADR-012 | Same-origin REST `/api/v1`, problem details, explicit commands, optimistic concurrency/idempotency | PROPOSED                      | API-facing entity/version requirements can be designed                            |
| ADR-013 | D1 relational principles and forward-only migrations                                               | PROPOSED                      | Direct prerequisite for Phase 03                                                  |
| ADR-014 | Two-phase D1/R2 state with reconciliation                                                          | PROPOSED                      | Applies only if ADR-010 includes attachments                                      |
| ADR-015 | Layered web security baseline                                                                      | PROPOSED                      | Identity/API implementation gates defined                                         |
| ADR-016 | Separated logs/audit/metrics and stakeholder-owned RPO/RTO                                         | STAKEHOLDER DECISION REQUIRED | Operational fields possible; targets blocked                                      |
| ADR-017 | Layered test architecture mapped to actual FR/BR/collective AC                                     | PROPOSED                      | Schema/domain tests can be planned                                                |
| ADR-018 | One-way adaptive password hashing and governed account lifecycle                                   | STAKEHOLDER DECISION REQUIRED | Identity columns can be reserved; KDF/reset/MFA policy blocked                    |

## 3. Provisional architecture recommendations

No ADR is `ACCEPTED`. The following recommendations are internally consistent inputs for stakeholder review and reversible design exploration only. They must not be converted into authoritative DDL, public API behavior, hospital policy, or production controls until the referenced ADR is accepted:

1. Stable organization/unit IDs exist on scoped records and assignments.
2. Status changes occur only through commands in `WORKFLOW-STATE-MACHINE.md`.
3. Risk grade is a decision/history attribute; `RISK_GRADED` is not a durable workflow state.
4. `RESUBMITTED` is an event/version boundary, not a durable state.
5. Original clinical-event data locks at formal submission; later facts use addenda.
6. Investigations and PMKP evaluations preserve immutable submitted versions/cycles.
7. Server owns actor identity, timestamps, status, scope, version, and audit metadata.
8. Authorization is default-deny and enforced server-side before scoped data is returned.
9. D1 uses explicit FK/check/unique constraints plus optimistic versions.
10. API errors use stable `application/problem+json` contracts.
11. D1 and R2 are reconciled, not treated as one transaction.
12. Test fixtures are synthetic and contain no real patient data.

## 4. Stakeholder decision package

### Critical before Phase 03 final schema approval

- official MVP organization scope and PMKP visibility;
- canonical workflow including `COMPLETED_BY_UNIT`, void/reopen/RCA handling;
- authentication/session option if identity schema belongs in Phase 03;
- audit integrity level and identity snapshot requirements;
- addendum/emergency-MR correction authority;
- retention/legal-hold policy ownership;
- attachment inclusion.

### Critical before production, but not all block initial schema drafting

- legal/policy treatment of e-paraf;
- MFA, password and recovery policy;
- post-completion addenda;
- print/export permissions and controls;
- RPO/RTO, alerting, restore drills;
- official `Form IKP.pdf` validation and PDF tolerance.

## 5. Recommended system architecture

```text
React SPA
  └─ same-origin /api/v1
       └─ Pages Functions middleware
            ├─ request ID / safe logging
            ├─ session + CSRF
            ├─ validation
            ├─ policy authorization
            └─ domain command service
                 ├─ D1 transaction: domain + state + audit
                 └─ R2 two-phase flow when approved
```

No microservices, event bus, CQRS, or external identity infrastructure is recommended for the documented scale.

## 6. Consistency matrix

| Cross-check              | Consistent rule                                                                                    | Evidence document                                   | Open issue                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Workflow ↔ RBAC          | Each command has one allowed actor plus scope/state checks                                         | `WORKFLOW-STATE-MACHINE.md`, `RBAC-MATRIX.md`       | Unit completion and PMKP scope approval         |
| Workflow ↔ data          | Status, grade, revisions, review cycles, addenda are separate concepts                             | `DATA-ARCHITECTURE.md`                              | Void/reopen/RCA states                          |
| Workflow ↔ audit         | Every consequential command inserts audit evidence atomically with D1 mutation                     | `SECURITY-ARCHITECTURE.md`                          | Integrity level                                 |
| RBAC ↔ API               | Server policy uses role + unit + owner + state + fields; generic status patch forbidden            | `API-CONTRACT.md`                                   | Multi-role/delegation                           |
| Authentication ↔ session | Opaque server session recommended; current assignments checked per request                         | `SECURITY-ARCHITECTURE.md`                          | JWT Blueprint deviation approval                |
| Session ↔ idle timeout   | Server `last_activity` and 15-minute deadline are authoritative                                    | `SECURITY-ARCHITECTURE.md`                          | Absolute lifetime and Remember Me approval      |
| Immutability ↔ addendum  | Submitted clinical snapshot never changes; addenda append                                          | `DATA-ARCHITECTURE.md`                              | Post-completion/emergency-MR policy             |
| Revision ↔ audit         | Submitted versions/cycles stay immutable; request/resubmit events linked                           | `WORKFLOW-STATE-MACHINE.md`, `DATA-ARCHITECTURE.md` | High-risk revision path                         |
| SLA ↔ timezone           | UTC instants, Asia/Makassar display, overdue only after exact 48h                                  | `DATA-ARCHITECTURE.md`                              | Clock skew/corrected incident time              |
| Attachment ↔ R2/D1       | Pending/quarantine/available lifecycle and reconciliation                                          | `DATA-ARCHITECTURE.md`                              | MVP inclusion/scanning/limits                   |
| Security ↔ API           | Same-origin, cookie/CSRF, validation, problem details, no-store                                    | `SECURITY-ARCHITECTURE.md`, `API-CONTRACT.md`       | Auth option approval                            |
| Security ↔ export/print  | Separate permission, scoped data, audit, no-store, safe CSV/download                               | `SECURITY-ARCHITECTURE.md`                          | Roles/watermark/Excel scope                     |
| Lifecycle ↔ audit        | No hard delete of evidence; proposed hold capability remains disabled until legal/records approval | `DATA-ARCHITECTURE.md`                              | Authority, procedure, and all retention periods |
| Testing ↔ FR/BR/AC       | Tests trace to real IDs; collective AC is not falsely split                                        | ADR-017                                             | Blueprint must map AC individually              |

## 7. Blueprint conflicts recorded, not silently changed

1. IBS-specific product versus hospital-wide PMKP access.
2. JWT stateless direction versus revocable 15-minute idle sessions, role changes, and account disablement.
3. “Password terenkripsi” versus correct password hashing.
4. “Immutable/tamper-proof” audit claims versus ordinary D1 table and `db.batch()`.
5. BR-07 requires NIP snapshot, conceptual audit model omits it.
6. Locked post-submit fields versus emergency MR correction.
7. Repeated revision flow versus one-to-one investigation/evaluation rows.
8. Addendum requirement versus missing addendum entity.
9. CSV in FR-07 versus CSV/Excel module scope.
10. PMKP regrade excludes BIRU without explanation.
11. Attachment/R2 model versus no clear FR/MVP inclusion.
12. Client-side “100% identical” PDF claim versus nondeterministic rendering.
13. Legal equivalence of e-paraf is asserted without approval evidence.
14. AC-01 through AC-05 are collectively named but not individually mapped.

## 8. Phase 03 readiness assessment

**BLOCKED.** The proposed baseline is detailed enough for stakeholder review and non-executable ERD exploration, but not for authoritative D1 schema/migration implementation. Phase 03 would otherwise encode unresolved hospital policy and could require destructive redesign.

Blocking approvals:

1. Confirm the official `Form IKP.pdf` version and field-level traceability.
2. Individually define or formally map AC-01 through AC-05.
3. Approve IBS/PMKP organizational scope and assignment model.
4. Approve the canonical workflow, especially the PMKP decision truth table, KUNING/MERAH RCA/handoff terminal path, branch-changing regrade, `COMPLETED_BY_UNIT`, void/reopen, and post-completion addenda.
5. Approve the authentication/session direction if Phase 03 includes identity/session schema.
6. Approve audit integrity level and BR-07 attribution snapshots.
7. Approve emergency-MR correction/addendum governance.
8. Decide whether attachments belong in MVP.
9. Assign ownership for retention and any proposed hold capability; periods may follow later, but Phase 03 must know which lifecycle concepts to model.
10. Record ADR governance metadata: named owner/required approvers, approval evidence, decision date, and review/supersession state.

After these decisions are recorded by named stakeholders, Phase 03 may create the D1 schema and forward-only migrations. Legal-signature status, exact retention periods, MFA, output controls, RPO/RTO, and PDF acceptance can remain gated for their implementation phases if the schema preserves the required extension points.
