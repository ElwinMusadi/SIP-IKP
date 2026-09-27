# Production Environment and Variable Matrix

## 1. Governance and Security Standard

This document catalogs every environment variable, configuration binding, and secret parameter used across the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**CRITICAL SECURITY RULES:**

1. Zero secrets in source control: No passwords, private keys, session tokens, or Cloudflare API tokens may ever be committed to git.
2. Distinct environment isolation: Local development, preview, and production environments utilize strictly separated databases and configuration contexts.
3. Client vs. Server isolation: Variables prefixed with `VITE_` are embedded into the client browser bundle and must strictly contain non-sensitive public metadata. Server-side environment variables and Cloudflare D1 bindings are inaccessible to the browser.

---

## 2. Environment Variable & Binding Matrix

| Parameter / Binding Name | Environment Target         | Purpose / Functional Scope                                                                                                | Classification            |    Production Required?    | Source / Storage Mechanism                                   | Default / Example Setting          |
| ------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------- | :------------------------: | ------------------------------------------------------------ | ---------------------------------- |
| **`DB`**                 | Cloudflare Pages Functions | Primary Cloudflare D1 relational database binding for incident reporting, sessions, and audit trails.                     | Internal Database Binding |          **YES**           | Cloudflare Dashboard & `wrangler.jsonc` (production binding) | Bound to production D1 database ID |
| **`APP_ENV`**            | Cloudflare Pages Functions | Execution environment identifier (`development`, `preview`, `production`). Controls error sanitization and log verbosity. | Public Configuration      |          **YES**           | Cloudflare Pages Environment Variable                        | `"production"`                     |
| **`VITE_APP_NAME`**      | Browser Client Bundle      | Application display title rendered in HTML headers and meta tags.                                                         | Public Client Variable    |          **YES**           | `.env` / Cloudflare Pages Build Env                          | `"SIP-IKP IBS"`                    |
| **`VITE_APP_ENV`**       | Browser Client Bundle      | Client runtime environment indicator for diagnostic badges.                                                               | Public Client Variable    |          Optional          | `.env` / Cloudflare Pages Build Env                          | `"production"`                     |
| **`VITE_API_BASE_PATH`** | Browser Client Bundle      | Relative API gateway prefix for same-origin fetch calls.                                                                  | Public Client Variable    |          **YES**           | `.env` / Build Configuration                                 | `"/api"`                           |
| **`SESSION_PEPPER`**     | Cloudflare Pages Functions | Optional additional secret salt component for session digest generation.                                                  | Sensitive Secret          |   Optional (Recommended)   | Cloudflare Secret (Encrypted)                                | Managed via `wrangler secret put`  |
| **`D1_PROD_STATE`**      | Local Node Tooling         | Directory name suffix for isolated local D1 SQLite state management in `database/d1-manager.ts`.                          | Test-Only Configuration   |  **NO** (Local / CI only)  | Environment variable during local execution                  | `"local-dev"`                      |
| **`D1_TEST_STATE`**      | Local Node Tooling         | Directory name suffix for isolated local D1 test harness state in `test-support/d1/harness.ts`.                           | Test-Only Configuration   |  **NO** (Local / CI only)  | Environment variable during test runs                        | `"process-<pid>"`                  |
| **`CI`**                 | CI / Automation            | Non-interactive execution flag for Wrangler D1 migration commands.                                                        | Test-Only Configuration   |      **NO** (CI only)      | CI Runner environment                                        | `"1"`                              |
| **`R2_BUCKET`**          | Cloudflare Pages Functions | Cloudflare R2 object storage bucket binding. Deferred from MVP per Decision #188.                                         | Obsolete for MVP          | **NO** (Deferred from MVP) | Cloudflare Dashboard (Future Phase)                          | Not bound in MVP                   |

---

## 3. Environment Separation Architecture

| Environment           | Frontend URL                                         | API Origin           | D1 Database Binding                            | R2 Storage      | Data Profile                                                 |
| --------------------- | ---------------------------------------------------- | -------------------- | ---------------------------------------------- | --------------- | ------------------------------------------------------------ |
| **Local Development** | `http://127.0.0.1:4173`                              | Same-origin (`/api`) | Local SQLite isolate (`.wrangler/state/v3/d1`) | None (Deferred) | Deterministic synthetic seed (`0001_initial_seed.sql`)       |
| **Preview / Staging** | `https://*.sip-ikp.pages.dev`                        | Same-origin (`/api`) | Preview D1 database (`sip-ikp-d1-preview`)     | None (Deferred) | Dedicated staging synthetic dataset (Zero real patient data) |
| **Production**        | Hospital custom domain / `https://sip-ikp.pages.dev` | Same-origin (`/api`) | Production D1 database (`sip-ikp-d1-prod`)     | None (Deferred) | Authoritative hospital operational data                      |

---

## 4. Secret Management Protocol for Production Operators

1. **Deploying Cloudflare Secrets:**
   To set sensitive environment variables in production, use the Wrangler CLI:
   ```bash
   npx wrangler pages secret put SESSION_PEPPER --project-name sip-ikp
   ```
2. **Auditing Committed Secrets:**
   The repository is continuously verified to ensure no `.dev.vars` or `.env` files containing sensitive values are committed. `.gitignore` strictly excludes `.dev.vars*` and `.env*.local`.
