# Architecture Change Control Protocol

## 1. Governance Purpose and Policy

This document establishes the formal **Architecture Change Control Protocol** for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**MANDATORY BASELINE GOVERNANCE RULE:**
Once an architecture baseline receives formal stakeholder authorization and is frozen (e.g. `ARCHITECTURE-BASELINE.md` Version 1.0.0), future implementation phases (Phase 07 through deployment) **MUST TREAT THE BASELINE AS AN AUTHORITATIVE CONTRACT**.

No engineer, agent, or developer may introduce silent or ad hoc architectural modifications. Any proposed deviation, additive entity, or transition modification must strictly follow the formal change workflow defined herein:

```text
Change Request (CR)
        ↓
Technical & Clinical Impact Analysis
        ↓
Stakeholder Authority Review & Approval
        ↓
Architecture Baseline Update & Version Increment
        ↓
Downstream DDL / Code Implementation
```

---

## 2. Architecture Change Workflow

1. **Step 1: Initiation of Change Request (CR)**
   - The requester (clinical lead, security officer, or technical architect) submits a structured Change Request identifying the problem, proposed modification, and business/clinical justification.
2. **Step 2: Impact Analysis**
   - The Software Architect evaluates downstream consequences across:
     - D1 database schemas, existing migrations, and foreign key integrity;
     - Workflow state machines, transition matrix invariants, and state queues;
     - Role-based authorization boundaries and unit query scopes;
     - Edge security, CSRF protection, and audit attribution snapshots;
     - Automated test harnesses, synthetic fixtures, and CI validation gates.
3. **Step 3: Stakeholder Review & Sign-Off**
   - The designated authority (as mapped in `docs/GOVERNANCE-APPROVER-MATRIX.md`) reviews the impact analysis and issues an official decision: `ACCEPTED`, `REJECTED`, or `DEFERRED`.
4. **Step 4: Baseline Version Increment**
   - Upon formal acceptance:
     - Clarifications / non-breaking documentation changes increment the **PATCH** version (e.g. `1.0.0` -> `1.0.1`).
     - Backwards-compatible additive schema/feature additions increment the **MINOR** version (e.g. `1.0.0` -> `1.1.0`).
     - Breaking workflow, security, or schema changes increment the **MAJOR** version (e.g. `1.0.0` -> `2.0.0`).
5. **Step 5: Traceable Implementation**
   - Forward-only D1 migrations and API handlers are implemented strictly referencing the approved Change Request ID.

---

## 3. Architecture Change Request Template

Every future change request must follow this specification:

```text
### CR-XXX: [Title of Proposed Architecture Change]

- **Change Request ID:** CR-XXX
- **Submission Date:** YYYY-MM-DD
- **Requester:** [Role and Institutional Authority]
- **Justification / Problem Statement:** [Why is the current baseline architecture inadequate?]
- **Impacted Artifacts:**
  - Governing ADR: [e.g. ADR-002, ADR-006]
  - Specifications: [e.g. CANONICAL-WORKFLOW.md, CANONICAL-DOMAIN-MODEL.md]
  - Database Schemas: [e.g. database/migrations/NNNN_*.sql]
  - API Contracts: [e.g. docs/openapi/auth.yaml, docs/API-CONTRACT.md]
  - Test Suites: [e.g. test-support/d1/harness.test.ts]
- **Multi-Dimensional Impact Analysis:**
  - Technical / D1 Impact: [Performance, storage, query execution]
  - Clinical Workflow Impact: [Impact on surgical reporting agility]
  - Security & Privacy Impact: [Impact on PHI confidentiality and RBAC]
- **Required Approving Authority:** [As designated in GOVERNANCE-APPROVER-MATRIX.md]
- **Approval Evidence Reference:** [Signed decree, memo, or meeting resolution]
- **Decision:** [ACCEPTED / REJECTED / DEFERRED]
- **Decision Date:** YYYY-MM-DD
- **Baseline Version Increment:** [e.g. 1.0.0 -> 1.1.0]
- **Supersedes:** [Prior CR or ADR clauses]
```

---

## 4. Architecture Change Request Register

| CR ID    | Title                                 | Date Submitted            | Requester | Impacted ADRs | Status       | Approval Evidence | Version Increment |
| -------- | ------------------------------------- | ------------------------- | --------- | ------------- | ------------ | ----------------- | ----------------- |
| _CR-001_ | _Example future change (placeholder)_ | _Pending Baseline Freeze_ | _Pending_ | _Pending_     | **INACTIVE** | _Pending_         | _None_            |

_Note: The Change Request Register is currently inactive because the initial Architecture Baseline has not yet been frozen. All pre-freeze changes are governed by the Domain Change Proposals (`docs/DOMAIN-CHANGE-PROPOSALS.md`) and Domain Decision Register (`docs/DOMAIN-DECISION-REGISTER.md`)._
