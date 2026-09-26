# Governance Decision Inventory

## 1. Document Scope and Authority

This document provides a single, exhaustive inventory of all architecture decisions, domain governance decisions, and identity contracts across the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**CRITICAL GOVERNANCE PRINCIPLE:** No decision in this inventory is marked `ACCEPTED` unless supported by real, documented stakeholder approval evidence from authorized hospital governance. In the absence of signed stakeholder evidence, all items remain `STAKEHOLDER DECISION REQUIRED`, `PROPOSED`, `PENDING POLICY`, or `PROVISIONAL`.

---

## 2. Decision Impact Classification Standard

Every decision is categorized according to its downstream implementation impact:

- **`[A] D1 BLOCKING`:** Directly blocks physical D1 table definition, foreign keys, column nullability, check constraints, or primary entity structures. Production D1 migrations cannot be generated until resolved.
- **`[B] PRODUCTION IMPLEMENTATION BLOCKING`:** Does not alter fundamental database schema, but strictly blocks production business endpoints, workflow command execution, or user permissions.
- **`[C] CONDITIONAL`:** Relevant only if another governing decision activates the capability (e.g. attachment schema is conditional on MVP inclusion).
- **`[D] NON-BLOCKING OPEN DECISION`:** Can remain open during initial technical development without compromising schema integrity, security boundaries, or clinical safety (e.g. non-functional percentile benchmarks, UI cosmetic labels).
- **`[E] INFORMATIONAL`:** Architectural principle, standard convention, or technical baseline guidance.

---

## 3. Architecture Decision Records (ADR Inventory)

| Decision ID & Title                           | Current Status                | Impact Classification      | Governing Area       | Primary Downstream Blocker                                                               |
| --------------------------------------------- | ----------------------------- | -------------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| **ADR-001** System Scope                      | STAKEHOLDER DECISION REQUIRED | **[A] D1 BLOCKING**        | Organization / Scope | Decides unit foreign keys, multi-unit data schema, and PMKP query boundary               |
| **ADR-002** Workflow State Machine            | PROPOSED                      | **[A] D1 BLOCKING**        | Workflow Lifecycle   | Decides lifecycle status check constraints, transition matrix, and RCA terminal path     |
| **ADR-003** RBAC & Authorization              | PROPOSED                      | **[B] PROD IMPL BLOCKING** | Security / Authz     | Decides server-side authorization middleware, unit assignment grants, and admin gates    |
| **ADR-004** Authentication & Session          | STAKEHOLDER DECISION REQUIRED | **[A] D1 BLOCKING**        | Identity / Session   | Decides whether `sessions` table is created in D1 (opaque cookie) vs JWT stateless       |
| **ADR-005** Draft Persistence                 | PROPOSED                      | **[A] D1 BLOCKING**        | Incident Reporting   | Mandates server-side draft table vs local cache; blocks draft DDL                        |
| **ADR-006** Immutability, Addenda & Revisions | PROPOSED                      | **[A] D1 BLOCKING**        | Domain Evidence      | Mandates 1:N `investigation_revisions`, 1:N `pmkp_review_cycles`, and `incident_addenda` |
| **ADR-007** Audit Trail Integrity             | STAKEHOLDER DECISION REQUIRED | **[A] D1 BLOCKING**        | Audit & Evidence     | Decides whether `audit_records` has hash-chaining columns (`prev_hash`, `event_hash`)    |
| **ADR-008** Digital Attribution / E-Paraf     | STAKEHOLDER DECISION REQUIRED | **[B] PROD IMPL BLOCKING** | Legal / Compliance   | Decides legal signature wording on PDF printout and re-authentication gates              |
| **ADR-009** SLA & Timezone Standard           | PROPOSED                      | **[A] D1 BLOCKING**        | Temporal Calculation | Establishes UTC storage, `Asia/Makassar` display, and strict 48h deadline columns        |
| **ADR-010** Attachment Architecture           | STAKEHOLDER DECISION REQUIRED | **[C] CONDITIONAL**        | Storage / Evidence   | Controls whether R2 bindings and `incident_attachments` D1 tables are deployed in MVP    |
| **ADR-011** Data Retention & Lifecycle        | STAKEHOLDER DECISION REQUIRED | **[A] D1 BLOCKING**        | Lifecycle / Storage  | Controls whether retention timestamps, archival tables, or legal-hold flags are modeled  |
| **ADR-012** API Architecture Baseline         | PROPOSED                      | **[B] PROD IMPL BLOCKING** | API Gateway          | Defines `/api/v1`, RFC 9457 problem details, optimistic concurrency, and idempotency     |
| **ADR-013** Database / D1 Principles          | PROPOSED                      | **[A] D1 BLOCKING**        | Database Engineering | Establishes SQLite `STRICT`, UUIDv7, UTC ISO 8601, and forward-only migrations           |
| **ADR-014** R2 / D1 Boundary                  | PROPOSED                      | **[C] CONDITIONAL**        | Storage Transaction  | Defines two-phase upload intent and reconciliation; active only if ADR-010 approved      |
| **ADR-015** Security Baseline                 | PROPOSED                      | **[B] PROD IMPL BLOCKING** | Edge Security        | Mandates CSP, frame denial, CORS default deny, CSRF header tokens, and log redaction     |
| **ADR-016** Observability / Operations        | STAKEHOLDER DECISION REQUIRED | **[D] NON-BLOCKING**       | Operations / SRE     | Establishes log redaction and correlation IDs; RPO/RTO targets can follow later          |
| **ADR-017** Test Architecture                 | PROPOSED                      | **[E] INFORMATIONAL**      | QA / Verification    | Defines test pyramid (unit, D1 harness, API harness, security, visual regression)        |
| **ADR-018** Password Security & MFA           | STAKEHOLDER DECISION REQUIRED | **[A] D1 BLOCKING**        | Credential Security  | Decides password hashing algorithm, work factors, lockout threshold, and MFA tables      |

---

## 4. Domain Decision Register (DDR Inventory)

| DDR ID     | Decision Title                        | Current Status                 | Impact Classification      | Governing ADR / Matrix | Primary Blocker                                                       |
| ---------- | ------------------------------------- | ------------------------------ | -------------------------- | ---------------------- | --------------------------------------------------------------------- |
| **DDR-01** | Scope: IBS-First vs Hospital-Wide     | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | ADR-001 / DM-001       | Organization foreign keys, cross-unit queries, PMKP scope             |
| **DDR-02** | Unit Completion (`COMPLETED_BY_UNIT`) | DISABLED / PENDING POLICY      | **[B] PROD IMPL BLOCKING** | ADR-002 / DM-005       | Objective minor KNC checklist and PMKP oversight mandate              |
| **DDR-03** | High-Risk RCA Terminal Handoff        | BLOCKED / STAKEHOLDER DECISION | **[B] PROD IMPL BLOCKING** | ADR-002 / DM-006       | Terminal state/referral for KUNING/MERAH incidents requiring RCA      |
| **DDR-04** | Regrade Consequences & BIRU Exclusion | BLOCKED / PENDING POLICY       | **[A] D1 BLOCKING**        | ADR-002 / DM-007       | Check constraints on regrade bands and cross-branch reset transitions |
| **DDR-05** | Incident Addendum Authorship          | PENDING POLICY                 | **[B] PROD IMPL BLOCKING** | ADR-006 / DM-011       | User role permissions for appending facts post-submission             |
| **DDR-06** | Emergency MR Correction Governance    | PENDING GOVERNANCE APPROVAL    | **[A] D1 BLOCKING**        | ADR-006 / DM-012       | Schema for `correction_requests` and audit-verified MR update flow    |
| **DDR-07** | Audit Trail Integrity Level           | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | ADR-007 / DM-013       | Cryptographic hash chaining vs application append-only D1 table       |
| **DDR-08** | Legal Status of Digital E-Paraf       | STAKEHOLDER DECISION REQUIRED  | **[B] PROD IMPL BLOCKING** | ADR-008 / DM-014       | Official replacement of wet signature and formal PDF wording          |
| **DDR-09** | Evidence Attachment MVP Inclusion     | CONDITIONAL / DEFERRED         | **[C] CONDITIONAL**        | ADR-010 / DM-016       | Inclusion of R2 storage and attachment tables in initial release      |
| **DDR-10** | Clinical Record Retention Schedule    | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | ADR-011 / DM-018       | Retention periods, archival triggers, and legal-hold metadata         |
| **DDR-11** | Staf K3RS vs Patient Conditionality   | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | Blueprint / DM-022     | Nullable patient demographics on occupational hazard reports          |
| **DDR-12** | Form IKP Source Verification          | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | Audit / DM-024         | Field-by-field verification against official physical hospital form   |

---

## 5. Identity & Data Model Decision Matrix (DM Inventory)

| DM ID      | Decision Area                        | Current Status                 | Impact Classification      | Governing ADR | Target Phase Dependency                  |
| ---------- | ------------------------------------ | ------------------------------ | -------------------------- | ------------- | ---------------------------------------- |
| **DM-001** | Organization scope definition        | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | ADR-001       | Blocks Phase 07 unit schema              |
| **DM-002** | Organization hierarchy model         | PROVISIONAL                    | **[A] D1 BLOCKING**        | ADR-001       | Blocks Phase 07 unit schema              |
| **DM-003** | User role assignment model           | PROVISIONAL                    | **[A] D1 BLOCKING**        | ADR-003       | Blocks Phase 07 role DDL                 |
| **DM-004** | Canonical workflow core states       | PROVISIONAL                    | **[A] D1 BLOCKING**        | ADR-002       | Blocks Phase 07 status checks            |
| **DM-005** | Unit completion criteria             | DISABLED / PENDING POLICY      | **[B] PROD IMPL BLOCKING** | ADR-002       | Blocks unit completion command           |
| **DM-006** | RCA handoff / terminal lifecycle     | BLOCKED / STAKEHOLDER DECISION | **[B] PROD IMPL BLOCKING** | ADR-002       | Blocks high-risk closure path            |
| **DM-007** | Regrade consequences & BIRU          | BLOCKED / PENDING POLICY       | **[A] D1 BLOCKING**        | ADR-002       | Blocks regrade check constraint          |
| **DM-008** | Cancel / void / reopen policy        | No active states               | **[B] PROD IMPL BLOCKING** | ADR-002       | Precludes unapproved reopen states       |
| **DM-009** | Incident submission immutability     | PROVISIONAL                    | **[A] D1 BLOCKING**        | ADR-006       | Blocks snapshot table DDL                |
| **DM-010** | Versioned investigation model        | PROVISIONAL                    | **[A] D1 BLOCKING**        | ADR-006       | Blocks 1:N investigation DDL             |
| **DM-011** | Addendum authorship policy           | PENDING POLICY                 | **[B] PROD IMPL BLOCKING** | ADR-006       | Blocks addendum permission               |
| **DM-012** | Emergency MR correction governance   | PENDING GOVERNANCE APPROVAL    | **[A] D1 BLOCKING**        | ADR-006       | Blocks correction request DDL            |
| **DM-013** | Audit trail integrity level          | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | ADR-007       | Blocks audit hashing schema              |
| **DM-014** | Digital attribution / e-paraf        | STAKEHOLDER DECISION REQUIRED  | **[B] PROD IMPL BLOCKING** | ADR-008       | Blocks PDF sign-off stempel              |
| **DM-015** | SLA timezone and boundary            | PROVISIONAL                    | **[A] D1 BLOCKING**        | ADR-009       | Partial (algorithm agreed, skew pending) |
| **DM-016** | Attachment MVP inclusion             | CONDITIONAL / DEFERRED         | **[C] CONDITIONAL**        | ADR-010       | Blocks R2 binding deployment             |
| **DM-017** | R2 / D1 lifecycle reconciliation     | PROVISIONAL                    | **[C] CONDITIONAL**        | ADR-014       | Conditional on DM-016                    |
| **DM-018** | Retention periods & legal hold       | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | ADR-011       | Blocks lifecycle TTL / jobs              |
| **DM-019** | Session architecture (Opaque vs JWT) | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | ADR-004       | Blocks D1 `sessions` table DDL           |
| **DM-020** | Password hashing & MFA policy        | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | ADR-018       | Blocks `user_credentials` DDL            |
| **DM-021** | Report number sequence allocation    | PROVISIONAL                    | **[A] D1 BLOCKING**        | Data Arch     | Blocks sequence counter DDL              |
| **DM-022** | Patient vs staff conditionality      | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | Blueprint     | Blocks snapshot column nullability       |
| **DM-023** | Action plan realization scope        | PROVISIONAL                    | **[D] NON-BLOCKING**       | Blueprint     | Action plan fields sufficient for MVP    |
| **DM-024** | Physical Form IKP verification       | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | Audit         | Blocks clinical field freezing           |
| **DM-025** | Individual AC-01–AC-05 mapping       | STAKEHOLDER DECISION REQUIRED  | **[E] INFORMATIONAL**      | Blueprint     | Test traceability mapping                |
| **DM-026** | API OpenAPI wire contract            | PROVISIONAL                    | **[B] PROD IMPL BLOCKING** | ADR-012       | Blocks API handler coding                |
| **DM-027** | Pagination / export limits           | PROVISIONAL                    | **[B] PROD IMPL BLOCKING** | ADR-012       | Blocks export handler coding             |
| **DM-028** | Observability / RPO / RTO            | STAKEHOLDER DECISION REQUIRED  | **[D] NON-BLOCKING**       | ADR-016       | Operational SLA targets                  |
| **DM-029** | ADR governance formal sign-off       | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | Governance    | Overall gate for Phase 07                |
| **DM-030** | Idle 15m & absolute 8-12h limits     | PROVISIONAL                    | **[B] PROD IMPL BLOCKING** | ADR-004       | Session middleware timers                |
| **DM-031** | Max 2 concurrent sessions            | PROVISIONAL                    | **[D] NON-BLOCKING**       | ADR-004       | Session management policy                |
| **DM-032** | Prohibit persistent session cookies  | PROVISIONAL                    | **[D] NON-BLOCKING**       | ADR-004       | "Remember Me" username only              |
| **DM-033** | Role-based MFA for Admin/PMKP        | STAKEHOLDER DECISION REQUIRED  | **[A] D1 BLOCKING**        | ADR-018       | Blocks `mfa_credentials` DDL             |
| **DM-034** | 10 failed logins = 15m lockout       | PROVISIONAL                    | **[B] PROD IMPL BLOCKING** | ADR-018       | Rate limiter policy                      |
| **DM-035** | Header anti-CSRF token binding       | PROVISIONAL                    | **[B] PROD IMPL BLOCKING** | ADR-004/015   | Mutating API middleware                  |
| **DM-036** | Admin clinical narrative denial      | PROVISIONAL                    | **[B] PROD IMPL BLOCKING** | ADR-003       | Admin authorization predicates           |

---

## 6. Domain Change Proposals (DCP Inventory)

| DCP ID     | Proposal Title                                                              | Source in Blueprint | Status  | Governing ADR |
| ---------- | --------------------------------------------------------------------------- | ------------------- | ------- | ------------- |
| **DCP-01** | Rectify "Auth JWT" to "Server-Side Opaque Session in HttpOnly Cookie"       | Section 4.3 & 6.3   | PENDING | ADR-004       |
| **DCP-02** | Correct "Password Terenkripsi" to "Salted Adaptive Password Hashing"        | Section 5.1 & 3.1   | PENDING | ADR-018       |
| **DCP-03** | Change 1:1 Investigation & PMKP to 1:N Versioned Revisions                  | Section 6.2         | PENDING | ADR-006       |
| **DCP-04** | Add Explicit `incident_addenda` Entity to Data Dictionary                   | Section 5.2         | PENDING | ADR-006       |
| **DCP-05** | Include NIP (`nip_nrp`) in Audit Table Definition                           | Section 6.2 vs 5.2  | PENDING | ADR-008       |
| **DCP-06** | Clarify PMKP Regrading Scope Regarding `BIRU`                               | Section 5.1 & 6.2   | PENDING | ADR-002       |
| **DCP-07** | Specify Conditional Validation for Staff K3RS Incidents                     | Section 5.1 & 6.2   | PENDING | DDR-11        |
| **DCP-08** | Reconcile Emergency MR Update with Permanent Lock via `correction_requests` | Section 2.2 vs 5.2  | PENDING | ADR-006       |

---

## 7. Inventory Summary and Production D1 Blocking Analysis

- **Total Decisions Tracked:** 18 ADRs + 12 DDRs + 36 DMs + 8 DCPs = 74 governance items.
- **Total `[A] D1 BLOCKING` Decisions:** 16 decisions directly block physical D1 migration generation.
- **Total `[B] PRODUCTION IMPLEMENTATION BLOCKING` Decisions:** 12 decisions block business endpoint implementation.
- **Total `[C] CONDITIONAL` Decisions:** 4 decisions govern deferred features (attachments).
- **Total `[D] NON-BLOCKING` Decisions:** 4 decisions can be finalized post-schema.
- **Total `[E] INFORMATIONAL` Decisions:** 2 baseline guidelines.
- **Governing Conclusion:** **PRODUCTION D1 MIGRATION IS 100% BLOCKED** until all 16 `[A] D1 BLOCKING` decisions receive formal stakeholder sign-off.
