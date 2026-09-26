# Identity and Access Decision Matrix

## 1. Scope and Authority

This document defines the formal readiness status of all identity, session, credential, authorization, and governance decisions for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**CRITICAL RULE:** No decision in this matrix is marked `ACCEPTED` unless backed by documented stakeholder approval evidence from hospital authority. In accordance with Phase 04 gating, all unapproved items remain `STAKEHOLDER DECISION REQUIRED` or `PROVISIONAL`.

---

## 2. Core Identity Decision Register

| ID                                   | Decision Area                                                                      | Current Status                | Blocking Implementation?                                                | Governing Dependency | Approval Authority Required                          |
| ------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------- | -------------------- | ---------------------------------------------------- |
| **DM-011** _(DM-019 in Data Matrix)_ | Session Architecture (Opaque Cookie Session vs Stateless JWT vs Hybrid)            | STAKEHOLDER DECISION REQUIRED | **YES** (blocks session D1 schema and auth handlers)                    | ADR-004              | Product Owner, Hospital IT Lead, Security Officer    |
| **DM-012** _(DM-020 in Data Matrix)_ | Password Hashing (Argon2id vs PBKDF2), Minimum Policy, Lockout, and MFA Scope      | STAKEHOLDER DECISION REQUIRED | **YES** (blocks credential D1 schema and login/recovery handlers)       | ADR-018              | Hospital Security Officer, IT Lead                   |
| **DM-013**                           | Audit Trail Integrity Level (Append-Only vs Hash Chaining vs External WORM Sink)   | STAKEHOLDER DECISION REQUIRED | **YES** (blocks audit D1 schema and attribution hashing)                | ADR-007              | Hospital Legal/Compliance, Audit Committee           |
| **DM-014**                           | Digital Attribution / E-Paraf (Attribution Evidence vs Legal Electronic Signature) | STAKEHOLDER DECISION REQUIRED | **YES** (blocks legal-signature claims and formal PDF signing language) | ADR-008              | Hospital Director, Legal / Medical Record Governance |
| **DM-029**                           | ADR Decision Governance (Formal Approval Evidence & Sign-off Dates for all ADRs)   | STAKEHOLDER DECISION REQUIRED | **YES** (blocks transition from Phase 04 to Phase 05 production DDL)    | Governance Baseline  | Hospital Directorate / IT Committee                  |

---

## 3. Supporting Identity & Access Decision Register

The following rows record supporting decision points across authorization, organizational scope, and workflow boundaries that interface directly with the identity domain:

| ID                             | Decision Area                                                                                     | Current Status                | Blocking Implementation?                              | Governing Dependency  | Approval Authority Required                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------- | --------------------- | -------------------------------------------------- |
| **DM-001**                     | Organizational Scope (IBS-First vs Hospital-Wide PMKP Access)                                     | STAKEHOLDER DECISION REQUIRED | **YES** (blocks production role-assignment grants)    | ADR-001               | Hospital Medical Directorate, PMKP Chair, IBS Head |
| **DM-002**                     | Organizational Hierarchy & Unit Relational Structures                                             | PROVISIONAL                   | **YES** (blocks unit D1 schema)                       | ADR-001               | Hospital IT Lead                                   |
| **DM-003**                     | User Role Assignment Model (Single-Role vs Multi-Role & Delegation)                               | PROVISIONAL                   | **YES** (blocks `role_assignments` DDL)               | ADR-003               | Hospital IT Lead, HR Governance                    |
| **DM-030** _(New in Phase 04)_ | Session Idle & Absolute Timeout Durations (15-min idle, 8–12 hr absolute limit)                   | PROVISIONAL                   | **YES** (blocks session validation middleware)        | ADR-004, Security NFR | Clinical Lead, IT Lead                             |
| **DM-031** _(New in Phase 04)_ | Concurrent Session Policy (Max 2 concurrent sessions vs strict single-session)                    | PROVISIONAL                   | No (can default to single-session until approved)     | ADR-004               | Security Officer                                   |
| **DM-032** _(New in Phase 04)_ | "Remember Me" Semantics (Client-side username memory only; persistent session cookies prohibited) | PROVISIONAL                   | No (defaults to prohibited persistent session)        | ADR-004, Security NFR | Security Officer                                   |
| **DM-033** _(New in Phase 04)_ | MFA Scope Policy (Role-Based for Admin/PMKP vs Hospital-Wide vs Deferred)                         | STAKEHOLDER DECISION REQUIRED | **YES** (blocks MFA schema and login flow)            | ADR-018               | Medical Directorate, IT Lead                       |
| **DM-034** _(New in Phase 04)_ | Password Lockout Threshold (10 failed attempts triggers 15-minute temporary lock)                 | PROVISIONAL                   | No (can default to progressive delay)                 | ADR-018               | Security Officer                                   |
| **DM-035** _(New in Phase 04)_ | Anti-CSRF Token Binding (`X-CSRF-Token` header bound to active session digest)                    | PROVISIONAL                   | **YES** (blocks mutating API handler implementation)  | ADR-004, ADR-015      | Technical Architect                                |
| **DM-036** _(New in Phase 04)_ | Administrator Clinical Access Prohibition (Zero default access to clinical incident narratives)   | PROVISIONAL                   | **YES** (blocks admin query authorization predicates) | ADR-003, Security NFR | Hospital Director, Clinical Lead                   |

---

## 4. Cross-Reference to General Data Model Matrix

For complete traceability across clinical and workflow domains:

- **DM-001 through DM-010**: See `docs/DATA-MODEL-DECISION-MATRIX.md` (System scope, workflow state machine, RBAC, submission immutability, revision history).
- **DM-011 through DM-020**: See Section 2 above and `docs/DATA-MODEL-DECISION-MATRIX.md` (Addenda, emergency MR correction, audit integrity, e-paraf, SLA timezone, attachments, retention, sessions, credentials).
- **DM-021 through DM-029**: See `docs/DATA-MODEL-DECISION-MATRIX.md` (Report numbering, patient/staff conditionality, action realization, form traceability, AC mapping, API contracts, observability, ADR governance).
- **DM-030 through DM-036**: Specific Identity & Session sub-decisions established in this document.

---

## 5. Decision Readiness Evaluation

- **Architecture Documentation Readiness:** 100% COMPLETE. Threat model, security acceptance criteria, candidate API contracts, and approval packages are fully articulated.
- **Stakeholder Approval Readiness:** 0% APPROVED. No human stakeholder or authorized hospital representative has executed formal sign-offs.
- **Phase Gating Conclusion:** Because DM-011, DM-012, and DM-029 remain **STAKEHOLDER DECISION REQUIRED**, production D1 migrations and authentication feature code are **STRICTLY BLOCKED**.
