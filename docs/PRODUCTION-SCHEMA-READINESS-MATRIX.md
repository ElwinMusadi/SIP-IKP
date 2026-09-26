# Production Schema Readiness Matrix

## 1. Governance Evaluation Standard

This matrix provides the authoritative readiness evaluation for converting candidate domain contracts into physical Cloudflare D1 migrations.

**GATING DEFINITIONS:**

- **Contract Complete:** YES only if the domain aggregate boundaries, field types, nullability, relationships, and constraints are fully specified in canonical documentation.
- **Approval Complete:** YES only if governing ADRs and stakeholder decision rows are formally approved with documented evidence.
- **Schema Ready:** **YES only if BOTH Contract Complete == YES AND Approval Complete == YES.** If approval is pending, Schema Ready MUST be **NO**.

---

## 2. Production Schema Readiness Matrix

| Domain Area                    | Contract Complete | Approval Complete | Schema Ready | Primary Blocking Decision(s)                                                         | Impact on Production DDL                                                |
| ------------------------------ | ----------------- | ----------------- | ------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Identity & Credentials**     | YES               | **NO**            | **NO**       | `DM-012` (ADR-018: Password KDF, MFA, lockout)                                       | Cannot finalize `user_credentials` table or hashing parameters          |
| **Users**                      | YES               | **NO**            | **NO**       | `DM-003` (ADR-003: User role assignment model)                                       | Cannot finalize user-to-role relationships                              |
| **Roles**                      | YES               | **NO**            | **NO**       | `DM-003` (ADR-003: Multi-role & delegation)                                          | Role definitions specified; multi-role schema unapproved                |
| **Units & Org Scope**          | YES               | **NO**            | **NO**       | `DM-001` (ADR-001: IBS-only vs Hospital-wide)                                        | Unit tables specified; cross-unit foreign keys unapproved               |
| **Incidents (Aggregate Root)** | YES               | **NO**            | **NO**       | `DM-004` (ADR-002: Workflow state machine)                                           | State enum CHECK constraint blocked by pending states                   |
| **Submission Snapshot**        | YES               | **NO**            | **NO**       | `DM-009` (ADR-006: Submission snapshot) & `DM-022` (Patient vs Staff conditionality) | Nullability rules for staff accidents blocked by `DM-022`               |
| **Risk Decisions**             | YES               | **NO**            | **NO**       | `DM-007` (ADR-002: Branch-changing regrade consequences)                             | Regrade band check constraints blocked by BIRU exclusion policy         |
| **Investigations**             | YES               | **NO**            | **NO**       | `DM-010` (ADR-006: Versioned investigation model)                                    | Table structure specified; version workflow unapproved                  |
| **PMKP Reviews**               | YES               | **NO**            | **NO**       | `DM-006` (ADR-002: Terminal RCA handoff lifecycle)                                   | Review cycles specified; terminal RCA handoff state unapproved          |
| **Addenda**                    | YES               | **NO**            | **NO**       | `DM-011` (ADR-006: Addendum authorship & lifecycle policy)                           | Table specified; author permissions & post-completion policy unapproved |
| **Correction Requests**        | YES               | **NO**            | **NO**       | `DM-012` (ADR-006: Emergency MR correction authority)                                | Table specified; requester/approver roles unapproved                    |
| **Attachments**                | YES               | **NO**            | **NO**       | `DM-016` (ADR-010: Attachment MVP inclusion) & `DM-017` (ADR-014: R2 lifecycle)      | **DEFERRED FROM MVP.** No production D1 tables created                  |
| **Audit Records**              | YES               | **NO**            | **NO**       | `DM-013` (ADR-007: Integrity assurance level) & `DM-014` (ADR-008: E-paraf)          | Table specified; hash-chaining fields blocked pending decision          |
| **Data Retention**             | YES               | **NO**            | **NO**       | `DM-018` (ADR-011: Retention governance & periods)                                   | **ZERO DELETION JOBS / TTLS.** Lifecycle timestamps unapproved          |
| **Reporting & Sequence**       | YES               | **NO**            | **NO**       | `DM-021` (Report number sequence allocation under concurrency)                       | Sequence counter table specified; concurrency mechanism unapproved      |

---

## 3. Summary Assessment

- **Contract Completeness:** 100% (15/15 domains have complete candidate specifications).
- **Approval Completeness:** 0% (0/15 domains have formal stakeholder sign-off evidence).
- **Overall Schema Readiness:** **0% READY (0/15 domains eligible for production DDL).**
- **Phase 05 Gate Classification:** **`DOMAIN_SCHEMA_READY_BLOCKED`** (Case B: Canonical domain model is complete, but production migrations are strictly blocked by unapproved governance dependencies).
