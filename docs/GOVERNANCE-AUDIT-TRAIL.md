# Governance Audit Trail

## 1. Scope and Governance Distinction

This document is the formal **Governance Audit Trail** recording all lifecycle status transitions, review events, and approval actions applied to Architecture Decision Records (ADRs), Domain Decision Registers (DDRs), Decision Matrix Items (DMs), and Domain Change Proposals (DCPs) for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**CRITICAL DISTINCTION:** This document records institutional and engineering governance history. It is **NOT** the clinical application audit log (`audit_records`).

---

## 2. Governance Event History

| Entry ID    | Date / Timestamp        | Decision ID                                  | Previous Status    | New Status                                      | Triggering Authority / Actor               | Approval Evidence Reference                                | Affected Governance Documents                                             | Action Summary & Notes                                                                                                                |
| ----------- | ----------------------- | -------------------------------------------- | ------------------ | ----------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **GAT-001** | 2026-09-26 07:00:00 UTC | All Architecture Decisions                   | Non-existent       | `PROPOSED` / `STAKEHOLDER DECISION REQUIRED`    | Software Architecture Lead (Phase 02)      | Architecture Audit Findings (`docs/ARCHITECTURE-AUDIT.md`) | `docs/ARCHITECTURE-DECISIONS.md`, `docs/ADR/*`                            | Initial formulation of 18 baseline ADRs. Explicitly marked unapproved pending stakeholder review.                                     |
| **GAT-002** | 2026-09-26 08:30:00 UTC | ADR-001 s/d ADR-018                          | `PROPOSED`         | `PROVISIONAL` / `STAKEHOLDER DECISION REQUIRED` | Architecture Review Lead (Phase 02 Review) | Phase 02 Consistency Review                                | `docs/ARCHITECTURE-DECISIONS.md`, `docs/ADR/*`                            | Removed any implication of accepted architecture; added explicit pending governance metadata blocks.                                  |
| **GAT-003** | 2026-09-26 09:15:00 UTC | `DM-001` s/d `DM-029`                        | Draft Analysis     | `PROVISIONAL` / `BLOCKED`                       | Data Architecture Lead (Phase 03)          | Reversible Data Harness Plan                               | `docs/DATA-MODEL-DECISION-MATRIX.md`, `docs/DATA-MODEL-CANDIDATE.md`      | Formalized 29 decision matrix rows with explicit blocking flags preventing premature DDL generation.                                  |
| **GAT-004** | 2026-09-26 09:50:00 UTC | `DM-011`, `DM-012`, `DM-030` s/d `DM-036`    | Candidate Proposal | `PROVISIONAL` / `BLOCKED`                       | Security Architecture Lead (Phase 04)      | Identity & Access Threat Model                             | `docs/IDENTITY-DECISION-MATRIX.md`, `docs/AUTH-API-CONTRACT.md`           | Established identity decision readiness; bound session & password decisions to ADR-004 and ADR-018.                                   |
| **GAT-005** | 2026-09-26 10:10:00 UTC | `DDR-01` s/d `DDR-12`, `DCP-01` s/d `DCP-08` | Domain Exploration | `PROVISIONAL` / `PENDING POLICY`                | Domain Governance Lead (Phase 05)          | Form IKP Traceability & Gap Analysis                       | `docs/DOMAIN-DECISION-REGISTER.md`, `docs/DOMAIN-CHANGE-PROPOSALS.md`     | Established 12 structured decision records and 8 Blueprint change proposals; barred production migrations.                            |
| **GAT-006** | 2026-09-26 10:25:00 UTC | All 74 Governance Items                      | Varied             | **`PENDING` (Formally Audited)**                | Governance Approval Gate (Phase 06)        | Repository & Governance Audit                              | `docs/GOVERNANCE-DECISION-INVENTORY.md`, `docs/APPROVAL-STATUS-MATRIX.md` | Formally inventoried all 74 items; confirmed zero signed stakeholder approvals exist; established `GOVERNANCE_APPROVAL_PENDING` gate. |

---

## 3. Mandatory Governance Invariants

1. **No Retrospective Modification:** Historical log entries in this document must never be altered or deleted. New decisions are appended as new entries.
2. **Strict Evidence Verification:** No status transition to `ACCEPTED` may be logged without a direct, verifiable reference to an official hospital decree, signed memo, or meeting resolution.
3. **Traceability:** Every entry must record the exact affected documents and the governing authority role responsible for the decision.
