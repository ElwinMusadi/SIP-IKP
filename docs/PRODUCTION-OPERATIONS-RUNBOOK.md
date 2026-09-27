# Production Operations and Maintenance Runbook

## 1. Document Scope and Governance

This runbook defines operational maintenance, incident response, secret management, backup recovery, and security protocols for the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang**.

**TARGET AUDIENCE:**

- Hospital IT Systems Engineers & Cloudflare Operators (Instalasi SIMRS).
- Hospital Information Security Officer (ISO).
- On-duty Hospital Systems Administrators.

**OPERATIONAL INVARIANTS:**

1. Zero secrets in plain documentation or git: Never write session secrets, API tokens, or staff credentials into runbooks.
2. Production data preservation: Never execute destructive D1 queries (`DROP TABLE`, `DELETE FROM incident_reports`, or `DELETE FROM audit_records`) on live environments.
3. Separation of duties: Clinical narrative and patient identity data remain masked from technical operators by default.

---

## 2. Standard Maintenance Operations

### 2.1 Standard Application Deployment (Routine Releases)

Executed during approved release windows:

```bash
# 1. Verify working branch and clean status
git checkout main && git pull origin main
git status

# 2. Run complete pre-deployment quality validation
npm run format:check
npm run typecheck
npm run lint
npm test
npm run d1:validate

# 3. Build optimized production assets
npm run build

# 4. Deploy to Cloudflare Pages production
npx wrangler pages deploy dist --project-name sip-ikp --branch main

# 5. Verify live liveness
curl -i https://sip-ikp.pages.dev/api/health
```

### 2.2 Emergency Production Hotfix Deployment

When an urgent defect or security vulnerability requires immediate edge patching:

1. Author the fix on a hotfix branch branched from `main`.
2. Ensure automated tests pass for the patched scenario (`npm test`).
3. Merge to `main` and execute immediate deploy:
   ```bash
   npm run build && npx wrangler pages deploy dist --project-name sip-ikp --branch main
   ```
4. Verify the fix immediately using designated synthetic canary accounts (`npm run canary:verify`).
5. Document the incident in `docs/GOVERNANCE-AUDIT-TRAIL.md`.

---

## 3. Database Operations and Schema Migrations

### 3.1 Applying Production D1 Migrations

Cloudflare D1 migrations are strictly **forward-only**:

```bash
# 1. Inspect unapplied migrations
npx wrangler d1 migrations list sip-ikp-d1 --remote

# 2. Execute forward migration safely in non-interactive CI mode
$env:CI="1"
npx wrangler d1 migrations apply sip-ikp-d1 --remote

# 3. Verify database integrity
npx wrangler d1 execute sip-ikp-d1 --remote --command "PRAGMA foreign_key_check;"
```

### 3.2 Database Backup and Disaster Recovery Procedure

- **Automatic Backups:** Cloudflare D1 automatically captures scheduled daily snapshots.
- **On-Demand Pre-Maintenance Backup:**
  ```bash
  # List existing backups
  npx wrangler d1 backup list sip-ikp-d1

  # Create an on-demand point-in-time backup snapshot
  npx wrangler d1 backup create sip-ikp-d1
  ```
- **Disaster Recovery (Restoring from Backup):**
  _Notice: Restoring a database snapshot rolls all tables back to the snapshot instant. Any transactions committed after the snapshot will be lost._
  ```bash
  # Restore to designated backup ID
  npx wrangler d1 backup restore sip-ikp-d1 <backup-id>
  ```
- **Recovery Time Objective (RTO):** 2–5 minutes.
- **Recovery Point Objective (RPO):** Maximum 24 hours under daily backups; <5 minutes if pre-maintenance backup was taken.

---

## 4. Secret Management and Rotation Protocol

### 4.1 Production Secrets Inventory

- `SESSION_PEPPER`: 256-bit cryptographically random salt component used in deriving server-side session digests.

### 4.2 Emergency Secret Rotation (`SESSION_PEPPER`)

If session compromise or administrative credential exposure is suspected:

1. Generate a new high-entropy 256-bit hex secret locally:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Upload the secret directly to Cloudflare Pages (never commit to git):
   ```bash
   npx wrangler pages secret put SESSION_PEPPER --project-name sip-ikp
   ```
3. **Operational Consequence:** Rotating `SESSION_PEPPER` invalidates all existing active browser session digests, immediately logging out all hospital users across all terminals. Users must log in again with their password.

---

## 5. Account Lifecycle and Access Offboarding

Standard operating procedures for user management follow `docs/PRODUCTION-ACCOUNT-PROVISIONING.md`.

### 5.1 Account Deactivation (Immediate Termination of Staff Access)

When a clinician resigns, is transferred outside IBS, or access is revoked:

```sql
-- 1. Soft deactivate account in D1 (never hard delete)
UPDATE users
SET is_active = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE username = '<STAFF_NIP>';

-- 2. Bulk revoke all active sessions immediately
UPDATE sessions
SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), revocation_reason = 'STAFF_OFFBOARDING'
WHERE user_id = (SELECT id FROM users WHERE username = '<STAFF_NIP>') AND revoked_at IS NULL;
```

---

## 6. Live Observability, Monitoring & Log Inspection

### 6.1 Real-Time Edge Log Streaming

Operators can inspect real-time edge HTTP requests and function execution traces via Wrangler:

```bash
npx wrangler pages deployment tail --project-name sip-ikp
```

### 6.2 Diagnosing Incident via `X-Request-ID`

When a hospital staff member reports an error on screen, they will see a displayed `ID Jejak / Request ID` (e.g. `req_e059d5b4-...`):

1. Copy the Request ID reported by the user.
2. Search Cloudflare Pages deployment logs or streaming tail for `requestId: "<uuid>"`.
3. The log will display:
   - Request method, URL pathname, and response HTTP status code.
   - Execution duration in milliseconds.
   - Error class name (if an unhandled exception occurred).
   - Sensitive clinical data, patient names, MR numbers, and passwords will be strictly `[REDACTED]`.

---

## 7. Security Incident Response Protocol

If a security anomaly, brute-force attack, or data breach is detected:

1. **Step 1 — Immediate Perimeter Assessment:** Check Cloudflare Analytics -> Security for volumetric spikes on `/api/auth/login`.
2. **Step 2 — IP Throttling / WAF Rule:** If targeted brute force is identified, block or challenge offending IP ranges via Cloudflare WAF Security Rules.
3. **Step 3 — Bulk Session Invalidation:** If session hijacking or token theft is suspected, revoke all active sessions across the hospital:
   ```sql
   UPDATE sessions
   SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), revocation_reason = 'SECURITY_INCIDENT_ISOLATION'
   WHERE revoked_at IS NULL;
   ```
4. **Step 4 — Post-Mortem & Notification:** Convene the Hospital Information Security Officer, IT Lead, and Chair of PMKP. Document the event and remediation in `docs/GOVERNANCE-AUDIT-TRAIL.md`.
