# Phase 15 — User Management & SLA MVP Deactivation Report

**Date:** 2026-09-27
**Status:** PASS
**Production:** https://sip-ikp.pages.dev/

---

## 1. User Management Scope

User Management is implemented for the `ADMINISTRATOR` role only.

**Capabilities:**
- List all users (with search, role filter, active/inactive filter)
- Create new users (with username, full name, role, profession, unit, password)
- Edit user data (full name, role, profession, unit)
- Activate / Deactivate users
- Session revocation on deactivation

**Not in scope:**
- Admin-initiated password reset (no secure delivery mechanism available; provisional passwords are set at creation time only)
- Username change after creation (username is immutable identifier)

---

## 2. User Management UI

**Route:** `/admin/users` (frontend)

**Components:**
- `src/features/admin/pages/user-management-page.tsx` — main page
- `src/features/admin/api/admin-api.ts` — API client

**Features:**
- Page header with "Tambah Pengguna" action
- Search by name/username
- Filter by role
- Filter by active/inactive status
- Desktop table with all user fields (no password_hash)
- Mobile card layout (responsive)
- Create dialog with form validation
- Edit dialog
- Confirmation dialog for activate/deactivate
- Loading state
- Empty state
- Error banner
- Success feedback (auto-dismiss after 4s)

**Role display:** Human-readable labels (Tenaga Kesehatan, Kepala Ruangan, Komite PMKP, Administrator) with color-coded badges.

---

## 3. User Management API/Backend

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/users` | GET | List users (with filters) |
| `/api/admin/users` | POST | Create user |
| `/api/admin/users/[id]` | GET | Get single user |
| `/api/admin/users/[id]` | PUT | Update user data |
| `/api/admin/users/[id]` | PATCH | Toggle activation status |

**Files:**
- `functions/api/admin/users/index.ts`
- `functions/api/admin/users/[id].ts`

**Validation (create):**
- `username`: 3-50 chars, `[a-z0-9_]` format only
- `full_name`: 2-150 chars
- `role`: must be one of the 4 canonical roles
- `profession`: 2-100 chars
- `password`: minimum 8 chars
- Username uniqueness enforced (409 on conflict)

**Validation (update):**
- Same as create except username is not editable

---

## 4. RBAC Enforcement

- All User Management endpoints enforce `canManageUsers(user)` server-side
- `canManageUsers` is defined in `functions/_shared/rbac.ts`: `user.isActive && user.role === "ADMINISTRATOR"`
- Frontend: `/admin/users` is wrapped in `<ProtectedRoute allowedRoles={["ADMINISTRATOR"]} />`
- Navigation link only visible to ADMINISTRATOR in `AppLayout`
- Non-ADMINISTRATOR direct URL access: client-side ProtectedRoute renders "Akses Terbatas"
- Server-side: all API endpoints return 403 for non-admin

**Test coverage:**
- Admin → 200/201 (allowed)
- TENAGA_KESEHATAN → 403
- KEPALA_RUANGAN → 403
- KOMITE_PMKP → 403
- Unauthenticated → 401

---

## 5. Account Lifecycle

**Create:** `is_active = 1` by default. Password hashed with PBKDF2-HMAC-SHA-256 before storage. Provisional password delivered out-of-band by administrator.

**Deactivation:**
- Sets `is_active = 0`
- Calls `revokeAllUserSessions()` → sets `revoked_at` on all active sessions with reason `ADMIN_DEACTIVATION`
- Login is rejected (session validation query filters `u.is_active = 1`)
- Existing authenticated operations are rejected

**Reactivation:**
- Sets `is_active = 1`
- No automatic session recreation; user must log in again

**Self-deactivation prevention:**
- PATCH endpoint returns 403 if `userId === auth.user.id`

**Hard-delete:** Not implemented. Existing architecture uses `ON DELETE RESTRICT` foreign keys; soft deactivation is the correct pattern.

---

## 6. Credential Handling

- Passwords are hashed with PBKDF2-HMAC-SHA-256 (100,000 iterations) using `functions/_shared/password.ts`
- No second hashing mechanism created
- `password_hash` column is never included in any SELECT that returns to the client
- API responses never include `password_hash` or `passwordHash`
- Passwords are never logged
- Passwords are never returned from the API
- Password is transmitted in request body over HTTPS only (never URL/query string)
- After creation, password cannot be retrieved — only reset (future scope)

---

## 7. Audit Behavior

User management events (create, update, activate/deactivate) are **not** written to `audit_records` table because:
- `audit_records` is schema-constrained to incident-domain events (`incident_id` is NOT NULL with FK to `incident_reports`)
- Adding administrative audit would require a schema migration (separate `admin_audit_records` table)
- This is consistent with the existing governance decision to keep the audit table minimal and incident-scoped

Administrative actions are logged at the infrastructure level via the existing `console.info` request log in `_middleware.ts` (method, path, status, duration).

**Future:** If administrative audit is required, a separate `admin_audit_records` table should be added via migration.

---

## 8. SLA Deactivation Strategy

**Feature flag location:** `functions/_shared/incident-service.ts`

```typescript
export const SLA_ENABLED = false
```

**When `SLA_ENABLED = false`:**
- Submission is NOT blocked if `overdue_reason` is missing
- `calculateSlaStatus()` still runs and stores `sla_deadline_utc` and `is_overdue_sla` on the record
- No SLA countdown, no overdue badge, no SLA column in UI
- No SLA KPI in dashboard or recap summary

**UI changes:**
- `SlaBadge` removed from incident list, detail page header
- SLA column removed from incident list table header and rows
- SLA column removed from recap table
- SLA summary card removed from recap page
- SLA compliance metric removed from PMKP dashboard

**Architecture preserved:**
- `calculateSlaStatus()` function retained
- `SLA_ENABLED` constant is the single toggle
- Database fields `sla_deadline_utc`, `is_overdue_sla`, `overdue_reason` retained (no schema change)
- `SlaBadge` component retained (can be re-added to UI when SLA is re-enabled)

---

## 9. SLA Future Reactivation

To re-enable SLA enforcement:

1. Set `SLA_ENABLED = true` in `functions/_shared/incident-service.ts`
2. Re-add `<SlaBadge>` to incident list, detail page header
3. Re-add SLA column to incident list and recap tables
4. Re-add SLA summary card to recap page
5. Re-add SLA metric to PMKP dashboard section
6. Update E2E test `PART E` to expect 422 on late submission without overdue_reason

No schema migration required. No backend logic needs to be rewritten. The enforcement gate in `submit.ts` is guarded by `SLA_ENABLED` only.

---

## 10. Workflow Regression

All canonical workflow transitions verified via existing test suite:
- DRAFT → SUBMITTED ✓
- SUBMITTED → UNDER_REVIEW (receive) ✓
- UNDER_REVIEW → REVISION_REQUIRED ✓
- REVISION_REQUIRED → SUBMITTED (resubmit) ✓
- UNDER_REVIEW → SIMPLE_INVESTIGATION (risk grade BIRU/HIJAU) ✓
- SIMPLE_INVESTIGATION → COMPLETED_BY_UNIT ✓
- UNDER_REVIEW → PMKP_REVIEW (risk grade KUNING/MERAH) ✓
- PMKP_REVIEW → COMPLETED ✓
- Emergency Correction (SUBMITTED/UNDER_REVIEW only) ✓

---

## 11. Security Regression

- Authentication: PBKDF2-HMAC-SHA-256, session cookie, CSRF token — unchanged
- Session lifecycle: idle timeout 15min, absolute 12h, revocation — unchanged
- CSRF enforcement: all state-changing API endpoints — unchanged
- Security headers: CSP, HSTS, X-Frame-Options, nosniff — unchanged
- RBAC: all existing canXxx() functions — unchanged
- Clinical privacy: `sanitizeReportForUser()` for Administrator — unchanged
- Password hashing: same `hashPassword()` / `verifyPassword()` used for user creation

---

## 12. Test Results

```
Test Files: 21 passed (21)
Tests:      131 passed (131)
```

**New test files:**
- `functions/api/admin/admin-user-management.test.ts` — 25 tests
- `functions/_shared/sla-deactivation.test.ts` — 5 tests

**Updated test:**
- `functions/api/incidents/e2e-scenarios.test.ts` — "PART E" updated to reflect SLA disabled behavior (late submission now allowed without overdue_reason)

---

## 13. Visual QA Result

**Desktop (1280px/1440px):**
- User Management list: table with all columns, clean typography, role badges
- Create/Edit dialog: modal with form, validation, clear labels
- Activate/Deactivate: confirmation dialog with user name
- Status badges: Aktif (green), Nonaktif (red)
- SLA column absent from incident list and recap
- SLA card absent from recap summary
- SLA metric absent from dashboard

**Mobile (360px/390px/414px):**
- User Management switches to card layout per user
- Cards show: name, username, role badge, unit, profession, Edit/Activate buttons
- No horizontal overflow
- Create/Edit dialog: full-width, fits viewport

---

## 14. Files Changed / Created

### New Files
```
functions/api/admin/users/index.ts         — GET /api/admin/users, POST /api/admin/users
functions/api/admin/users/[id].ts          — GET/PUT/PATCH /api/admin/users/[id]
functions/api/admin/admin-user-management.test.ts  — 25 tests
functions/_shared/sla-deactivation.test.ts — 5 tests
src/features/admin/api/admin-api.ts        — frontend API client
src/features/admin/pages/user-management-page.tsx — User Management page
```

### Modified Files
```
functions/_shared/incident-service.ts      — Added SLA_ENABLED = false constant
functions/api/incidents/[id]/submit.ts     — SLA guard now conditional on SLA_ENABLED
functions/api/incidents/e2e-scenarios.test.ts — Updated PART E for SLA disabled
src/app.tsx                                — Added /admin/users route
src/features/incidents/pages/incidents-list-page.tsx    — Removed SLA column/badge
src/features/incidents/pages/incident-detail-page.tsx   — Removed SlaBadge from header
src/features/incidents/pages/incidents-recap-page.tsx   — Removed SLA column/card
src/routes/home-page.tsx                  — Removed SLA KPI tile from PMKP dashboard
```

---

## 15. Known Limitations

1. **No admin-initiated password reset UI.** Creating a user sets a provisional password; no mechanism to reset it later without a separate feature. Justification: shipping an insecure "reset by email" or "reset by admin" without a secure delivery channel is worse than deferring the feature.

2. **Administrative actions not in audit_records.** The existing audit schema is incident-scoped with a NOT NULL FK. A separate admin audit table requires a migration; deferred.

3. **No pagination on User Management list.** For MVP the user count is small. If the dataset grows, server-side pagination should be added via `LIMIT`/`OFFSET` in the API.

4. **Unit field is free-text.** The `unit_id` field accepts any string. For MVP (IBS only), the default is `"IBS"`. In future, this could be validated against `master_departments`.

---

## 16. Production Deployment

Changes are committed and pushed to `origin/main`. Cloudflare Pages automatically deploys from `main`. No D1 schema migration required for any Phase 15 changes. Production database is not modified.

---

## Acceptance Criteria Verification

| Criterion | Status |
|---|---|
| Administrator can access User Management | ✅ PASS |
| Non-admin cannot access it | ✅ PASS |
| User list works | ✅ PASS |
| User search/filter works | ✅ PASS |
| User creation works | ✅ PASS |
| User editing works | ✅ PASS |
| User activation/deactivation works | ✅ PASS |
| Password/credential data never exposed | ✅ PASS |
| RBAC enforced server-side | ✅ PASS |
| Existing authentication functional | ✅ PASS |
| SLA disabled for MVP | ✅ PASS |
| SLA code/architecture retained | ✅ PASS |
| SLA does not block submission | ✅ PASS |
| overdue_reason not required due to SLA | ✅ PASS |
| SLA not displayed as active functionality | ✅ PASS |
| SLA not used as dashboard KPI | ✅ PASS |
| SLA not required for reporting | ✅ PASS |
| SLA can be reactivated via documented configuration | ✅ PASS |
| Existing incident workflow still works | ✅ PASS |
| Authentication still works | ✅ PASS |
| RBAC still works | ✅ PASS |
| Emergency Correction still works | ✅ PASS |
| Simple Investigation still works | ✅ PASS |
| PMKP still works | ✅ PASS |
| Reporting still works | ✅ PASS |
| Print still works | ✅ PASS |
| Existing production security controls intact | ✅ PASS |
| Tests pass | ✅ PASS (131/131) |
| Build passes | ✅ PASS |
