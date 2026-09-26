# Data Model Decision Matrix

## 1. Purpose

This matrix prevents proposed architecture from silently entering DDL, API, permissions, or production behavior. No row is accepted unless named approvers and evidence are recorded in the governing ADR/change process.

## 2. Status definitions

- `PROVISIONAL`: reversible candidate only.
- `PENDING APPROVAL`: stakeholder decision required.
- `PENDING POLICY`: capability disabled pending governance.
- `CONDITIONAL`: relevant only if another capability is approved.
- `BLOCKED`: implementation prohibited now.

## 3. Decision matrix

| ID     | Data Concern                | Current Candidate                    | Decision Needed                                      | ADR / Source             | Blocking?           |
| ------ | --------------------------- | ------------------------------------ | ---------------------------------------------------- | ------------------------ | ------------------- |
| DM-001 | Organization scope          | IBS-first, scoped IDs                | IBS-only versus hospital-wide PMKP access            | ADR-001                  | Yes                 |
| DM-002 | Organization hierarchy      | Stable unit/facility IDs             | Exact hierarchy and IBS subtree                      | ADR-001                  | Yes                 |
| DM-003 | Multi-role/delegation       | Role assignments candidate           | Union/active role, delegation, expiry, self-approval | ADR-003                  | Yes                 |
| DM-004 | Workflow core               | Proposed durable states/events       | Formal acceptance and command guards                 | ADR-002                  | Yes                 |
| DM-005 | `COMPLETED_BY_UNIT`         | Disabled reference only              | KNC criteria, evidence, oversight                    | ADR-002 / PENDING POLICY | Yes                 |
| DM-006 | RCA/high-risk terminal path | Extension point only                 | Handoff/state/completion semantics                   | ADR-002                  | Yes                 |
| DM-007 | Regrade history             | Versioned decision candidate         | Branch-changing consequences and BIRU                | ADR-002                  | Yes                 |
| DM-008 | Cancel/void/reopen          | No active states                     | Need, authority, destination, preserved evidence     | ADR-002                  | Yes                 |
| DM-009 | Incident immutability       | Formal snapshot candidate            | Accept snapshot/version model                        | ADR-006                  | Yes                 |
| DM-010 | Investigation revision      | Versioned candidate                  | Accept version workflow/high-risk applicability      | ADR-006                  | Yes                 |
| DM-011 | Addendum                    | Append-only candidate                | Authors, states, approval, post-completion           | ADR-006 / PENDING POLICY | Yes                 |
| DM-012 | Emergency MR correction     | Request/approval concept             | Requester, approver, separation, audit               | ADR-006                  | Yes                 |
| DM-013 | Audit integrity             | Restricted append-only candidate     | Assurance level, reader scope, retention             | ADR-007                  | Yes                 |
| DM-014 | Attribution/e-paraf         | Actor snapshot candidate             | Legal terminology, fields, re-auth/MFA               | ADR-008                  | Yes                 |
| DM-015 | SLA/time                    | UTC + Asia/Makassar, strict `>48h`   | Clock skew and corrected-time impact                 | ADR-009                  | Partial             |
| DM-016 | Attachment inclusion        | Documentation-only extension         | Include or defer from MVP                            | ADR-010                  | Conditional         |
| DM-017 | D1/R2 lifecycle             | Intent/quarantine/finalize candidate | Scanner, limits, cleanup, retention                  | ADR-014                  | Conditional         |
| DM-018 | Retention/lifecycle         | No periods/jobs                      | Owners, triggers, periods, disposition/hold          | ADR-011                  | Yes                 |
| DM-019 | Session architecture        | No Phase 03 schema                   | JWT/opaque/hybrid approval                           | ADR-004                  | Yes for auth schema |
| DM-020 | Password/accounts           | Identity extension only              | KDF, policy, recovery, MFA                           | ADR-018                  | Yes for auth schema |
| DM-021 | Report numbering            | Separate human identifier            | Atomic allocation, month zone, retry/void behavior   | Data Architecture        | Yes                 |
| DM-022 | Patient versus staff target | Conditional model needed             | Applicable fields/nullability                        | Blueprint gap            | Yes                 |
| DM-023 | Action realization          | Plan fields known                    | Status, evidence, verifier, effectiveness            | Blueprint gap            | Yes                 |
| DM-024 | Official Form IKP           | Unverified source                    | Version and field traceability                       | Audit                    | Yes                 |
| DM-025 | AC mapping                  | Collective block only                | Individual AC-01–AC-05 mapping                       | Blueprint                | Yes                 |
| DM-026 | API wire contract           | Architecture outline                 | Accepted OpenAPI schemas/operations                  | ADR-012                  | Yes                 |
| DM-027 | Pagination/export           | Candidate cursor/bounds              | Limits, async export, CSV/Excel                      | ADR-012                  | Later API blocker   |
| DM-028 | Observability/RPO/RTO       | Request ID/redaction foundation only | Sink, retention, alerts, backup/restore targets      | ADR-016                  | Production blocker  |
| DM-029 | ADR governance              | All approval fields pending          | Named owners/approvers/evidence/dates                | All ADRs                 | Yes                 |

## 4. Conditional capability gates

| Capability               | Current default | API exposure     | DDL finalization           | Required approval |
| ------------------------ | --------------- | ---------------- | -------------------------- | ----------------- |
| Addendum creation        | Disabled        | No               | Candidate only             | DM-011            |
| Complete by unit         | Disabled        | No               | Do not finalize transition | DM-005            |
| RCA handoff              | Blocked         | No               | Extension point only       | DM-006            |
| Branch-changing regrade  | Blocked         | No               | History candidate only     | DM-007            |
| Emergency MR correction  | Blocked         | No               | Request concept only       | DM-012            |
| Attachment/R2            | Deferred        | No               | No production table        | DM-016/017        |
| Hash chain/external sink | Not selected    | No special claim | No assurance-specific DDL  | DM-013            |
| Auth/session             | Not implemented | No               | No production schema       | DM-019/020        |
| Retention/deletion jobs  | Disabled        | No               | No TTL/jobs                | DM-018            |

## 5. Safe reversible Phase 03 work

- candidate entity documentation;
- disposable D1 harness with synthetic-only harness tables;
- setup/reset/fixture/teardown testing;
- request ID validation and propagation;
- baseline application log redaction;
- API response/assertion test helpers;
- candidate concurrency expectation constants;
- OpenAPI/readiness documentation;
- no-permission policy placeholders only if default-deny and non-executable.

## 6. Prohibited finalization

Do not create authoritative application tables, status CHECKs, session/password schema, attachment lifecycle schema, retention jobs, business endpoints, role permissions, workflow transitions, or legal/tamper-proof claims until their matrix row is approved.

## 7. Dependency graph

```text
DM-001/002/003 → scoped ownership/assignments/indexes
DM-004/005/006/007/008 → status constraints and command schemas
DM-009/010/011/012 → snapshot/revision/addendum/correction model
DM-019/020 → identity/session schema and auth wire contract
DM-013/014 → audit/attribution fields and assurance tests
DM-016 → DM-017 → R2/D1 schema and reconciliation tests
DM-018 → lifecycle fields, jobs, disposition and backups
DM-024/025 → clinical fields, nullability, validation and acceptance tests
DM-026 → business handler implementation
```

## 8. Exit criteria for authoritative DDL

- relevant ADR status becomes `ACCEPTED` with governance metadata;
- DM-001–014, DM-018, DM-021–025, and DM-029 decisions affecting the schema are resolved or explicitly excluded;
- accepted ERD and field traceability exist;
- production migration naming/review/restore plan is approved;
- schema tests map to accepted requirements without fabricated IDs.

## 9. Exit criteria for business API implementation

- accepted OpenAPI/equivalent wire contract;
- accepted auth/session and CSRF architecture for protected APIs;
- accepted workflow/authorization matrices;
- accepted candidate-to-DDL mapping;
- endpoint-specific scope, ETag, idempotency, error, pagination, and cache semantics.
