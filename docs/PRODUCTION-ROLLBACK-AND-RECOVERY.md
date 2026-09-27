# Production Rollback and Disaster Recovery Protocol

## 1. Governance Principles & Core Distinctions

This document establishes the official rollback and disaster recovery protocol for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**CRITICAL ARCHITECTURAL REALITY:**
There is a fundamental difference between rolling back frontend/edge application code and rolling back a distributed relational database:

1. **Application Rollback (Instant & Safe):** Cloudflare Pages supports instantaneous, zero-downtime rollbacks to any prior immutable deployment snapshot.
2. **Database Migration Rollback (Non-Automated & Forward-Only):** SQLite/D1 does not support automatic down-migrations. Once columns or tables are created, rolling back code that expects those columns requires forward-fix migrations.
3. **Data Recovery (Restoration from Snapshot):** Restoring a database from a backup snapshot rolls back all data to the snapshot instant, potentially losing transactions committed since the backup.

---

## 2. Component-by-Component Rollback Procedures

### 2.1 Application Layer Rollback (Cloudflare Pages SPA + Functions)

Cloudflare Pages maintains an immutable build artifact for every git deployment.

- **When to Execute:** If a frontend defect, visual regression, or edge runtime JavaScript error is discovered post-deployment.
- **Rollback Procedure:**
  1. Open Cloudflare Dashboard -> Workers & Pages -> `sip-ikp` -> Deployments.
  2. Locate the previous verified deployment commit (e.g. Phase 10 commit `07f416b`).
  3. Click "..." -> "Rollback to this deployment".
  4. Alternatively, via Wrangler CLI:
     ```bash
     npx wrangler pages deployment rollback <deployment-id> --project-name sip-ikp
     ```
- **Execution Time:** ~5–10 seconds.
- **Availability Impact:** Zero downtime; edge nodes immediately route incoming requests to the previous immutable bundle.

---

### 2.2 Database Migration Rollback Limitations & Forward-Fix Protocol

Cloudflare D1 migrations in `database/migrations/` are **FORWARD-ONLY**.

- **Why Down-Migrations are NOT Automated:**
  - SQLite has limited `ALTER TABLE` capabilities (e.g., dropping columns or constraints can require copying entire tables).
  - Down-migrations that drop columns or tables will permanently destroy clinical data submitted by staff.
- **Forward-Fix Engineering Protocol:**
  - If a schema defect is identified post-migration, **NEVER attempt to delete or edit existing migration files**.
  - Author a new forward migration (e.g. `0003_fix_schema_issue.sql`) that safely adjusts schema, adds missing indexes, or corrects constraints without data loss.
  - Test the forward migration locally via `database/d1-manager.ts` before applying to production.

---

### 2.3 Database Disaster Recovery (Restoration from Backup Snapshot)

Cloudflare D1 automatically captures daily snapshots and allows manual on-demand point-in-time backups.

- **When to Execute:** Catastrophic data corruption, accidental bulk deletion, or unrecoverable database consensus failure.
- **Backup Verification & Restore Command:**
  1. Inspect available D1 backups:
     ```bash
     npx wrangler d1 backup list sip-ikp-d1
     ```
  2. Restore from designated backup snapshot:
     ```bash
     npx wrangler d1 backup restore sip-ikp-d1 <backup-id>
     ```
- **Recovery Point Objective (RPO):** Maximum 24 hours under automatic daily snapshots; near-zero if an on-demand snapshot was executed immediately prior to deployment.
- **Recovery Time Objective (RTO):** Approximately 2–5 minutes to restore the SQLite database file on Cloudflare's primary region.

---

## 3. Summary of Reversibility Matrix

| Artifact / Layer             | Reversal Mechanism                               |           Automated?           |                 Data Loss Risk?                  |  Safe to Execute Live?  |
| ---------------------------- | ------------------------------------------------ | :----------------------------: | :----------------------------------------------: | :---------------------: |
| **Frontend UI (React SPA)**  | Cloudflare Pages Rollback                        |            **YES**             |                       Zero                       |    **YES** (Instant)    |
| **Edge Functions (/api/\*)** | Cloudflare Pages Rollback                        |            **YES**             |                       Zero                       |    **YES** (Instant)    |
| **Database Migrations**      | Forward-Fix Migration (`0003_*.sql`)             | **NO** (Manual forward script) |             Zero (Designed forward)              | **YES** (After testing) |
| **Database Data**            | D1 Backup Snapshot Restore                       |       **YES** (via CLI)        | **HIGH** (Loss of data committed after snapshot) |   **EMERGENCY ONLY**    |
| **Master Data Values**       | Soft Deactivation (`is_active = 0`)              |            **YES**             |                       Zero                       |         **YES**         |
| **User Accounts**            | Soft Deactivation (`is_active = 0`)              |            **YES**             |                       Zero                       |         **YES**         |
| **Active Sesi**              | Session Revocation (`POST /auth/session/revoke`) |            **YES**             |              Zero (Forces re-login)              |         **YES**         |
