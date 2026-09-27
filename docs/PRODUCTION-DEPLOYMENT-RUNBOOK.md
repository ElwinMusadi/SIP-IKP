# Production Deployment Runbook

## 1. Scope and Deployment Governance

This runbook defines the exact deployment procedure for publishing the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang** to Cloudflare Pages and Cloudflare D1.

**OPERATIONAL DIRECTIVE:**

1. Zero destructive production executions: Never execute database reset, database teardown, or ad-hoc table drop commands against production databases.
2. Forward-only migrations: All database modifications must be executed through ordered, reviewed migration scripts in `database/migrations/`.
3. Safe credentials: Never deploy default or synthetic test passwords to production user accounts.

---

## 2. Pre-Deployment Verification Checklist

Before initiating production deployment, the deployment engineer must verify:

- [ ] **Git Branch & Status:** Current branch is `main`, tracking `origin/main`, with a clean working tree (`git status` reports no untracked or modified files).
- [ ] **Automated Test Validation:** Run complete test suite (`npm test`). All 101 tests must pass.
- [ ] **Code Quality & Typing:** Run `npm run typecheck && npm run lint && npm run format:check`. Zero errors and zero warnings allowed.
- [ ] **Client & Worker Compilation:** Run `npm run build && npm run cf:validate`. Both client SPA and Cloudflare Functions Worker must compile successfully.
- [ ] **Local D1 Database Validation:** Run `npm run d1:validate`. Foreign keys and seed structures must pass validation.
- [ ] **Cloudflare Authentication:** Deployment engineer is logged in via Wrangler CLI (`npx wrangler whoami`).
- [ ] **Production D1 Binding Target:** Identify the production D1 database name/ID in the Cloudflare dashboard (e.g. `sip-ikp-d1-prod`).
- [ ] **Backup Snapshot:** Create an on-demand snapshot of the production D1 database if an existing database is already active.

---

## 3. Deployment Execution Steps

### Step 1: Deploy Cloudflare Pages Application

Deploy the pre-compiled client bundle and Functions to Cloudflare Pages:

```bash
# 1. Compile production client build
npm run build

# 2. Deploy to Cloudflare Pages production environment
npx wrangler pages deploy dist --project-name sip-ikp --branch main
```

### Step 2: Apply Production D1 Migrations

Execute ordered forward-only migrations against the production D1 database:

```bash
# Apply initial schema migration
npx wrangler d1 migrations apply sip-ikp-d1 --remote
```

_Note: If executing migration files individually, execute in strict numerical order:_

1. `0001_initial_production_schema.sql`
2. `0002_submission_snapshots.sql`

### Step 3: Populate Production Master Data (First Release Only)

Populate standard hospital reference data (operating rooms, specializations, departments, payer types):

```bash
# Execute master data insertion (omit synthetic users)
npx wrangler d1 execute sip-ikp-d1 --remote --command "SELECT COUNT(*) FROM master_operating_rooms;"
```

### Step 4: Verify Health and Edge Connectivity

Verify edge Functions deployment using cURL or browser:

```bash
curl -i https://sip-ikp.rsudwzjohannes.id/api/health
```

**Expected Response:**

- HTTP `200 OK`
- Header: `X-Request-ID: <uuid>`
- Header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Body: `{"status":"ok","service":"sip-ikp-pages-functions","environment":"production","requestId":"..."}`

---

## 5. Post-Deployment Verification (Smoke Test Protocol)

Execute the post-deployment smoke test scenarios in `docs/PRODUCTION-SMOKE-TEST.md`:

1. **Health Verification:** Access `/api/health`, verify 200 OK and response headers.
2. **Login Verification:** Log in with authorized staff credentials; verify session cookie `__Host-session_id` is set with `Secure`, `HttpOnly`, `SameSite=Strict`.
3. **Role Resolution:** Verify the header bar renders the correct staff name, profession, and role badge.
4. **Draft Creation:** Create a test incident with minimum data; verify `DRAFT` status and `DRAFT_CREATED` audit event.
5. **Auto-Save Test:** Edit a field; verify "Semua perubahan tersimpan" indicator appears.
6. **Submission Verification:** Complete mandatory fields; submit report; verify report number format `IKP/IBS/YYYYMM/XXXX` and snapshot creation.
7. **Head Room Workflow:** Log in as Kepala Ruangan IBS; receive report (`UNDER_REVIEW`); verify manual risk grading routes correctly.
8. **Simple Investigation:** Verify investigation worksheet loads, recommendation/action rows add cleanly, and completion marks `COMPLETED_BY_UNIT`.
9. **Formal Print:** Open `/laporan/:id/cetak`; verify A4 layout, hospital kop, patient data, and attribution blocks.
10. **Operational Recap:** Open `/laporan/rekap`; apply filters; verify summary metrics calculate accurately.
11. **Logout:** Log out; verify cookie is purged and back-button on protected routes redirects to `/login`.
