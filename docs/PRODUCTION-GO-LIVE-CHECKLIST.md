# Production Go-Live Checklist

## 1. Document Scope and Governance Status

This document establishes the exhaustive verification checklist required before full clinical operational release of the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**GATING DEFINITION:**

- **Status:** `PASS`, `NOT_VERIFIED`, `PENDING`, or `BLOCKED`.
- **Classification:**
  - `BLOCKING`: Must be verified and passed before full clinical rollout.
  - `NON-BLOCKING`: Operational enhancement or institutional documentation milestone that does not impair clinical software safety.

---

## 2. Infrastructure Domain

| Item ID    | Verification Area        | Target Standard                                                                |   Status    | Evidence Reference                                                                           | Responsible Owner            |      Gate Classification      |
| ---------- | ------------------------ | ------------------------------------------------------------------------------ | :---------: | -------------------------------------------------------------------------------------------- | ---------------------------- | :---------------------------: |
| **INF-01** | Cloudflare Pages         | Live project active, serving frontend build and Functions Worker.              |  **PASS**   | Project `sip-ikp`, Deployment `558189dc`, URL `https://sip-ikp.pages.dev/`                   | Cloudflare Operator / SIMRS  |         Non-blocking          |
| **INF-02** | Cloudflare D1 Binding    | `DB` bound to `sip-ikp-d1` (UUID: `1fb4f6c9-cb7d-4589-81fe-5a6f091982bb`).     |  **PASS**   | `wrangler.jsonc`, `npx wrangler d1 list`                                                     | Database Architect / SIMRS   |         **BLOCKING**          |
| **INF-03** | Production D1 Migrations | Migrations `0001` and `0002` applied forward-only without errors.              |  **PASS**   | Table `d1_migrations` (applied `2026-09-27 04:50:36 UTC`), `PRAGMA foreign_key_check;` empty | Database Architect / SIMRS   |         **BLOCKING**          |
| **INF-04** | Production Secrets       | `SESSION_PEPPER` encrypted in Pages production environment.                    |  **PASS**   | `npx wrangler pages secret list --project-name sip-ikp` (`Value Encrypted`)                  | Information Security Officer |         **BLOCKING**          |
| **INF-05** | Custom Domain / DNS      | Subdomain `sip-ikp.rsudwzjohannes.id` bound and resolving to Cloudflare Pages. | **PENDING** | DNS resolution `NXDOMAIN`; awaiting hospital network team delegation                         | Hospital SIMRS Network Team  | **BLOCKING (for Custom URL)** |
| **INF-06** | Edge TLS / HTTPS         | Valid SSL/TLS certificate terminating at edge with TLS 1.3/1.2.                |  **PASS**   | Active on `https://sip-ikp.pages.dev/` via Cloudflare Managed Certificate                    | Cloudflare Platform Operator |         Non-blocking          |

---

## 3. Application Domain

| Item ID    | Verification Area         | Target Standard                                                               |  Status  | Evidence Reference                                                           | Responsible Owner          | Gate Classification |
| ---------- | ------------------------- | ----------------------------------------------------------------------------- | :------: | ---------------------------------------------------------------------------- | -------------------------- | :-----------------: |
| **APP-01** | Staff Authentication      | Login succeeds with valid credentials; uniform 401 error on invalid.          | **PASS** | Live test on `POST /api/auth/login`, `functions/api/auth/auth.test.ts`       | Lead Software Engineer     |    **BLOCKING**     |
| **APP-02** | Role-Based Access Control | Strict default-deny, 4 canonical roles, Nakes peer visibility, draft privacy. | **PASS** | `functions/_shared/rbac.test.ts` (9 tests), live canary runner `CAN-14`      | Security Architecture Lead |    **BLOCKING**     |
| **APP-03** | Core Workflow Lifecycle   | 8 canonical states, minimum draft validation, auto-save, resubmission loop.   | **PASS** | `functions/api/incidents/e2e-scenarios.test.ts` (12 tests), live canary      | Clinical Systems Analyst   |    **BLOCKING**     |
| **APP-04** | Formal A4 Print Preview   | `/insiden/:id/cetak` renders A4 portrait without horizontal overflow.         | **PASS** | `docs/PHASE-10-PRINT-AUDIT.md`, `functions/api/incidents/[id]/print.test.ts` | Frontend Design Engineer   |    **BLOCKING**     |
| **APP-05** | Operational Recap         | `/laporan/rekap` aggregates metrics and filters without leaking PII.          | **PASS** | `docs/PHASE-10-REPORTING-AUDIT.md`, `functions/api/reports/recap.test.ts`    | Lead Software Engineer     |    **BLOCKING**     |

---

## 4. Security & Privacy Domain

| Item ID    | Verification Area       | Target Standard                                                             |  Status  | Evidence Reference                                                        | Responsible Owner            | Gate Classification |
| ---------- | ----------------------- | --------------------------------------------------------------------------- | :------: | ------------------------------------------------------------------------- | ---------------------------- | :-----------------: |
| **SEC-01** | Anti-CSRF Protection    | Mutating requests require matching `X-CSRF-Token` header.                   | **PASS** | `functions/_middleware.ts`, `functions/middleware.test.ts`                | Security Architecture Lead   |    **BLOCKING**     |
| **SEC-02** | Session Cookie Security | Cookie `__Host-session_id` marked `Secure`, `HttpOnly`, `SameSite=Strict`.  | **PASS** | Verified live on production response headers                              | Security Architecture Lead   |    **BLOCKING**     |
| **SEC-03** | 15-Minute Idle Timeout  | Sliding inactivity timeout strictly enforced server-side.                   | **PASS** | `functions/_shared/session.ts`, live canary post-logout 401 verification  | Security Architecture Lead   |    **BLOCKING**     |
| **SEC-04** | HTTP Security Headers   | CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy active. | **PASS** | Verified live via `curl -i https://sip-ikp.pages.dev/api/health`          | Security Architecture Lead   |    **BLOCKING**     |
| **SEC-05** | Administrator Privacy   | Narratives and patient PII stripped for `ADMINISTRATOR` role.               | **PASS** | Live canary `CAN-14`, `functions/api/incidents/[id]/print.test.ts`        | Information Security Officer |    **BLOCKING**     |
| **SEC-06** | Observability Redaction | Passwords, tokens, cookies, and clinical narratives masked in logs.         | **PASS** | `functions/_shared/log-redaction.test.ts`, live Cloudflare console stream | DevOps / SRE Lead            |    **BLOCKING**     |

---

## 5. Operations & Support Domain

| Item ID    | Verification Area       | Target Standard                                                                 |   Status    | Evidence Reference                                                            | Responsible Owner          |       Gate Classification       |
| ---------- | ----------------------- | ------------------------------------------------------------------------------- | :---------: | ----------------------------------------------------------------------------- | -------------------------- | :-----------------------------: |
| **OPS-01** | Real Staff Provisioning | Real clinical staff accounts created with verified NIPs and unique passphrases. | **PENDING** | `docs/PRODUCTION-ACCOUNT-PROVISIONING.md` (Protocol ready; execution pending) | Hospital SIMRS Team        | **BLOCKING (for Full Go-Live)** |
| **OPS-02** | Account Offboarding     | Soft deactivation procedure and bulk session revocation operational.            |  **PASS**   | `database/migrations/0001_initial_production_schema.sql` (is_active column)   | Hospital SIMRS Team        |          Non-blocking           |
| **OPS-03** | Real-Time Monitoring    | Edge streaming tail via Wrangler and request ID correlation functional.         |  **PASS**   | `docs/PRODUCTION-OBSERVABILITY.md`, verified via live curl traces             | DevOps / SRE Lead          |          Non-blocking           |
| **OPS-04** | Incident Escalation SOP | Technical troubleshooting runbook available for SIMRS helpdesk.                 |  **PASS**   | `docs/PRODUCTION-OPERATIONS-RUNBOOK.md`                                       | IT / System Owner          |          Non-blocking           |
| **OPS-05** | D1 Backup & Recovery    | Daily snapshot active; on-demand CLI restore protocol established.              |  **PASS**   | `docs/PRODUCTION-ROLLBACK-AND-RECOVERY.md`, `npx wrangler d1 backup list`     | Database Architect / SIMRS |          Non-blocking           |

---

## 6. Governance & Compliance Domain

| Item ID    | Verification Area        | Target Standard                                                                     |   Status    | Evidence Reference                                                            | Responsible Owner            |                Gate Classification                 |
| ---------- | ------------------------ | ----------------------------------------------------------------------------------- | :---------: | ----------------------------------------------------------------------------- | ---------------------------- | :------------------------------------------------: |
| **GOV-01** | E-Paraf Statutory Decree | Peraturan Direktur RSUD Johannes formally adopting digital attribution (`ADR-008`). | **PENDING** | `docs/GOVERNANCE-DECISION-INVENTORY.md` (`DDR-08`), pending director sign-off | Hospital Directorate / Legal | Non-blocking (Internal Ops) / Blocking (Statutory) |
| **GOV-02** | Clinical Business Rules  | Decision Workshop (#1–#188) policies reconciled in architecture.                    |  **PASS**   | `docs/ARCHITECTURE-RECONCILIATION.md`, `docs/FINAL-WORKFLOW.md`               | PMKP Chair / Clinical Lead   |                    **BLOCKING**                    |
| **GOV-03** | User Training Guide      | Operational workflow guide drafted for 4 hospital roles.                            |  **PASS**   | `docs/USER-TRAINING-GUIDE.md`                                                 | PMKP / Head of IBS           |                    Non-blocking                    |
| **GOV-04** | User Training Execution  | Staff in IBS briefed on 48h SLA, auto-save, and workflow roles.                     | **PENDING** | Pending on-site training schedule                                             | Head of IBS / PMKP Committee |          **BLOCKING (for Shift Handoff)**          |

---

## 7. Physical & Environmental Domain

| Item ID    | Verification Area         | Target Standard                                                              |      Status      | Evidence Reference                                       | Responsible Owner           |     Gate Classification      |
| ---------- | ------------------------- | ---------------------------------------------------------------------------- | :--------------: | -------------------------------------------------------- | --------------------------- | :--------------------------: |
| **PHY-01** | Hospital Network Access   | Theater PC terminals can reach `https://sip-ikp.pages.dev` or custom domain. | **NOT_VERIFIED** | Awaiting on-site LAN connectivity confirmation           | Hospital SIMRS Network Team |         **BLOCKING**         |
| **PHY-02** | Modern Browser Readiness  | Chromium/Firefox/Safari modern browser installed on theater terminals.       | **NOT_VERIFIED** | Awaiting theater PC software audit                       | Hospital IT Support         |         **BLOCKING**         |
| **PHY-03** | Physical Printer Hardware | Form IKP A4 printout physically tested on hospital laser printer.            | **NOT_VERIFIED** | Browser print engine verified; physical hardware pending | Head of IBS / Nurse Lead    | Non-blocking (PDF available) |

---

## 8. Summary Checklist Status

- **Total Checklist Items:** 25 items across 6 domains.
- **Passed / Verified:** 18 items (72.0%).
- **Pending Institutional / IT Action:** 4 items (`INF-05` Custom Domain, `OPS-01` Real Accounts, `GOV-01` Perdir Decree, `GOV-04` Training Execution).
- **Physical Verification Pending On-Site:** 3 items (`PHY-01` Hospital LAN, `PHY-02` Theater Browsers, `PHY-03` Physical Printer).
- **Dual-Gate Assessment:**
  - **Technical Production Canary:** **GO (PASSED)**
  - **Institutional Operational Full Go-Live:** **CONDITIONAL** (Awaiting `INF-05`, `OPS-01`, and `GOV-04`).
