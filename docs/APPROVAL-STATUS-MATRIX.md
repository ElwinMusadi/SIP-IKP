# Approval Status Matrix

## 1. Governance Evaluation Policy

This matrix tracks the formal governance status of every architecture, identity, workflow, and data decision across the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**MANDATORY RULE:** Permitted statuses are `PENDING`, `ACCEPTED`, `REJECTED`, `DEFERRED`, or `SUPERSEDED`. In the absence of documented signed approval evidence from hospital authority, decisions MUST remain **`PENDING`**. Neither technical recommendations nor automated test passes constitute approval.

---

## 2. Complete Approval Status Matrix

| Decision ID | Decision Title                                    | Current Status | Approval Evidence Reference                      | Blocking Production D1?                | Affected Phase                            |
| ----------- | ------------------------------------------------- | -------------- | ------------------------------------------------ | -------------------------------------- | ----------------------------------------- |
| **ADR-001** | System Scope: IBS-First vs Hospital-Wide          | PENDING        | None (Awaiting Hospital Directorate sign-off)    | **YES**                                | Phase 07 (Schema)                         |
| **ADR-002** | Workflow State Machine & Transition Matrix        | PENDING        | None (Awaiting PMKP Committee review)            | **YES**                                | Phase 07 (Schema) & Phase 08 (Workflow)   |
| **ADR-003** | RBAC & Authorization Boundary                     | PENDING        | None (Awaiting Security Officer sign-off)        | **YES**                                | Phase 07 (Roles) & Phase 08 (API)         |
| **ADR-004** | Authentication & Session (Opaque Cookie vs JWT)   | PENDING        | None (Awaiting SIMRS/IT Owner approval)          | **YES**                                | Phase 07 (Sessions DDL) & Phase 08 (Auth) |
| **ADR-005** | Server-Authoritative Draft Persistence            | PENDING        | None (Awaiting Security Officer review)          | **YES**                                | Phase 07 (Draft DDL)                      |
| **ADR-006** | Immutability, Addenda & Versioned Revisions       | PENDING        | None (Awaiting Legal/PMKP sign-off)              | **YES**                                | Phase 07 (Snapshots & Revisions DDL)      |
| **ADR-007** | Audit Trail Integrity & Assurance Level           | PENDING        | None (Awaiting Hospital Audit/Security sign-off) | **YES**                                | Phase 07 (Audit DDL)                      |
| **ADR-008** | Digital Attribution / E-Paraf Legal Adoption      | PENDING        | None (Awaiting Hospital Director Decree)         | No (Blocks legal claims & PDF wording) | Phase 09 (PDF & Legal Output)             |
| **ADR-009** | SLA 48h Timezone & Boundary Standard              | PENDING        | None (Awaiting PMKP Indicator sign-off)          | **YES**                                | Phase 07 (SLA columns)                    |
| **ADR-010** | Attachment Architecture (MVP Deferral)            | PENDING        | None (Awaiting Product Owner scope sign-off)     | Conditional                            | Phase 07 (R2 bindings)                    |
| **ADR-011** | Clinical Record Retention Schedule                | PENDING        | None (Awaiting Medical Records JRA schedule)     | **YES**                                | Phase 07 (Lifecycle schema)               |
| **ADR-012** | API Architecture & Error Contract                 | PENDING        | None (Awaiting IT Owner technical sign-off)      | No (Blocks business API coding)        | Phase 08 (API Gateway)                    |
| **ADR-013** | Database / D1 Physical Principles                 | PENDING        | None (Awaiting IT Owner technical sign-off)      | **YES**                                | Phase 07 (Schema DDL)                     |
| **ADR-014** | R2 / D1 Consistency Boundary                      | PENDING        | None (Awaiting IT Owner review)                  | Conditional                            | Phase 07 (Storage jobs)                   |
| **ADR-015** | Security Baseline & Edge Controls                 | PENDING        | None (Awaiting Security Officer review)          | No (Blocks deployment)                 | Phase 08 (Middleware)                     |
| **ADR-016** | Observability & Operational RPO/RTO               | PENDING        | None (Awaiting SRE/Management SLA sign-off)      | No (Non-blocking for D1)               | Operations & Deployment                   |
| **ADR-017** | Test Architecture Baseline                        | PENDING        | None (Awaiting QA strategy review)               | No (Informational)                     | Continuous Integration                    |
| **ADR-018** | Password Security, KDF & MFA Scope                | PENDING        | None (Awaiting Security Officer sign-off)        | **YES**                                | Phase 07 (Credentials DDL) & Phase 08     |
| **DDR-01**  | Scope: IBS-First Relational Model                 | PENDING        | None (Awaiting Hospital Directorate sign-off)    | **YES**                                | Phase 07 (Unit schema)                    |
| **DDR-02**  | Unit Completion Criteria (`COMPLETED_BY_UNIT`)    | PENDING        | None (Awaiting PMKP Quality resolution)          | No (Feature remains disabled)          | Phase 08 (Workflow)                       |
| **DDR-03**  | High-Risk RCA Terminal Handoff State              | PENDING        | None (Awaiting PMKP Quality resolution)          | **YES**                                | Phase 07 (Status CHECK) & Phase 08        |
| **DDR-04**  | Regrade Consequences & BIRU Scope                 | PENDING        | None (Awaiting PMKP Quality resolution)          | **YES**                                | Phase 07 (Regrade CHECK)                  |
| **DDR-05**  | Incident Addendum Authorship Policy               | PENDING        | None (Awaiting Medical Records policy)           | No (Entity candidate ready)            | Phase 08 (Addendum API)                   |
| **DDR-06**  | Emergency MR Correction Governance                | PENDING        | None (Awaiting Medical Records SOP sign-off)     | **YES**                                | Phase 07 (Correction DDL)                 |
| **DDR-07**  | Audit Hash Chaining vs Append-Only                | PENDING        | None (Awaiting Security Officer review)          | **YES**                                | Phase 07 (Audit schema)                   |
| **DDR-08**  | Official Hospital Decree on E-Paraf               | PENDING        | None (Awaiting Hospital Director Decree)         | No (Technical attribution ready)       | Phase 09 (PDF Output)                     |
| **DDR-09**  | Evidence Attachment MVP Inclusion                 | PENDING        | None (Awaiting Product Owner scope sign-off)     | Conditional                            | Phase 07 (R2 schema)                      |
| **DDR-10**  | Incident Data Retention Schedule                  | PENDING        | None (Awaiting Medical Records JRA schedule)     | **YES**                                | Phase 07 (Lifecycle schema)               |
| **DDR-11**  | Staf K3RS vs Patient Conditionality               | PENDING        | None (Awaiting K3RS & PMKP joint sign-off)       | **YES**                                | Phase 07 (Snapshot nullability)           |
| **DDR-12**  | Form IKP Physical Field Verification              | PENDING        | None (Awaiting IBS/PMKP joint audit sign-off)    | **YES**                                | Phase 07 (Clinical columns)               |
| **DCP-01**  | Blueprint Change: Auth JWT to Opaque Session      | PENDING        | None (Awaiting IT/PMKP change control approval)  | No (Governs Blueprint edit)            | Change Control Gate                       |
| **DCP-02**  | Blueprint Change: Password Terenkripsi to Hashing | PENDING        | None (Awaiting Security change control approval) | No (Governs Blueprint edit)            | Change Control Gate                       |
| **DCP-03**  | Blueprint Change: 1:1 to 1:N Revisions            | PENDING        | None (Awaiting PMKP change control approval)     | No (Governs Blueprint edit)            | Change Control Gate                       |
| **DCP-04**  | Blueprint Change: Add `incident_addenda`          | PENDING        | None (Awaiting PMKP change control approval)     | No (Governs Blueprint edit)            | Change Control Gate                       |
| **DCP-05**  | Blueprint Change: Include NIP in Audit Table      | PENDING        | None (Awaiting Legal change control approval)    | No (Governs Blueprint edit)            | Change Control Gate                       |
| **DCP-06**  | Blueprint Change: Clarify BIRU Regrade Scope      | PENDING        | None (Awaiting PMKP change control approval)     | No (Governs Blueprint edit)            | Change Control Gate                       |
| **DCP-07**  | Blueprint Change: Staf K3RS Conditionality        | PENDING        | None (Awaiting K3RS change control approval)     | No (Governs Blueprint edit)            | Change Control Gate                       |
| **DCP-08**  | Blueprint Change: Emergency MR Correction         | PENDING        | None (Awaiting Rekam Medis approval)             | No (Governs Blueprint edit)            | Change Control Gate                       |

---

## 3. Summary Statistics

- **Total Tracked Governance Items:** 38 items.
- **Total ACCEPTED Decisions:** **0 (Zero)**.
- **Total PENDING Decisions:** **38 (100%)**.
- **Total REJECTED / DEFERRED Decisions:** **0**.
- **Governance Gate Outcome:** Production D1 migration cannot proceed. All 16 primary schema blockers remain **`PENDING`**.
