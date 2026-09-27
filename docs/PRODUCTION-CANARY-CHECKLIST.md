# Production Canary Deployment Checklist and Verification Procedure

## 1. Canary Strategy Purpose and Scope

A canary release verifies that a newly published deployment of the **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang** functions reliably in the live Cloudflare production environment before full clinical traffic is routed to it.

**CORE SAFETY RULE:** The canary verification is executed by designated hospital IT personnel using dedicated canary testing accounts with synthetic test incidents. Real patient medical record numbers must never be used during the canary phase.

---

## 2. Canary Operational Profiles

- **Canary Operator:** Hospital Lead Deployment Engineer / Clinical Systems Administrator.
- **Canary Roles Required:**
  1. Designated Healthcare Worker Account (`TENAGA_KESEHATAN`, IBS)
  2. Designated Unit Head Account (`KEPALA_RUANGAN`, IBS)
  3. Designated Quality Committee Account (`KOMITE_PMKP`)
  4. Designated Systems Administrator Account (`ADMINISTRATOR`)
- **Execution Window:** Pre-scheduled maintenance window or early morning non-operating shift.

---

## 3. Canary Verification Steps

| Step       | Endpoint / Interface Tested                      | Executing Role           | Action Description                                                     | Pass Criteria                                                                                                   | Fail Criteria                                                 |
| ---------- | ------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **CAN-01** | `GET /api/health`                                | Public (Unauthenticated) | Verify Cloudflare Functions runtime liveness and edge connectivity.    | HTTP 200, valid `X-Request-ID`, `status: "ok"`, `environment: "production"`.                                    | Status != 200, timeout > 5000ms, or unhandled 500 error.      |
| **CAN-02** | `POST /api/auth/login`                           | Nakes Canary Account     | Submit login request with valid credentials.                           | HTTP 200, `Set-Cookie: __Host-session_id` present with `HttpOnly; Secure; SameSite=Strict`, returns CSRF token. | Status != 200, cookie missing, or invalid response format.    |
| **CAN-03** | `GET /api/auth/session`                          | Nakes Canary Account     | Validate session retrieval using issued cookie.                        | HTTP 200, user profile returned with matching Nakes role and IBS unit.                                          | Status == 401, session unrecognized, or timeout.              |
| **CAN-04** | `GET /api/master-data`                           | Nakes Canary Account     | Verify production master data loading from D1.                         | HTTP 200, operating rooms (OK 1–8), specializations, and payer types populated.                                 | Empty arrays or database query error.                         |
| **CAN-05** | `POST /api/incidents`                            | Nakes Canary Account     | Create persistent draft with minimum synthetic data (`[CANARY TEST]`). | HTTP 201 Created, `status: "DRAFT"`, `row_version: 1`, `DRAFT_CREATED` audit recorded.                          | Validation failure, HTTP 500, or database write timeout.      |
| **CAN-06** | `PATCH /api/incidents/:id/draft`                 | Nakes Canary Account     | Execute auto-save on draft fields.                                     | HTTP 200 OK, `row_version: 2`, `ETag: "W/2"`.                                                                   | Status == 412, data loss, or server error.                    |
| **CAN-07** | `POST /api/incidents/:id/submit`                 | Nakes Canary Account     | Submit complete report with synthetic patient data.                    | HTTP 200 OK, `status: "SUBMITTED"`, report number allocated (`IKP/IBS/YYYYMM/XXXX`), snapshot created.          | Submission rejected, sequence collision, or snapshot missing. |
| **CAN-08** | `POST /api/incidents/:id/receive`                | Head Room Canary Account | Kepala Ruangan receives submitted report.                              | HTTP 200 OK, `status: "UNDER_REVIEW"`, `received_by_user_id` recorded.                                          | Status != 200, or unauthorized error.                         |
| **CAN-09** | `POST /api/incidents/:id/assign-risk-grade`      | Head Room Canary Account | Assign `BIRU` risk grade to incident.                                  | HTTP 200 OK, `status: "SIMPLE_INVESTIGATION"`, `simple_investigations` row initialized.                         | Status != 200, or invalid status transition.                  |
| **CAN-10** | `PUT /api/incidents/:id/investigation`           | Head Room Canary Account | Fill Form page 3 worksheet and save draft.                             | HTTP 200 OK, causes and recommendations persisted in D1.                                                        | HTTP != 200, or date check failure.                           |
| **CAN-11** | `POST /api/incidents/:id/investigation/complete` | Head Room Canary Account | Complete simple investigation.                                         | HTTP 200 OK, `status: "COMPLETED_BY_UNIT"` (terminal), audit event `REPORT_COMPLETED` emitted.                  | HTTP != 200, or status not terminal.                          |
| **CAN-12** | `GET /api/incidents/:id/print`                   | Head Room Canary Account | Open formal A4 print view (`/laporan/:id/cetak`).                      | HTTP 200 OK, full clinical facts, Kop, and attribution blocks rendered without visual clipping.                 | Horizontal overflow, missing Kop, or broken styles.           |
| **CAN-13** | `GET /api/reports/recap`                         | PMKP Canary Account      | Open operational recap (`/laporan/rekap`).                             | HTTP 200 OK, aggregate summary metrics compute accurately; zero patient PII leaked.                             | Patient names exposed, or metrics calculation error.          |
| **CAN-14** | `GET /api/incidents/:id`                         | Administrator Account    | Query incident detail as administrator.                                | HTTP 200 OK, patient name, No. MR, and chronology are strictly sanitized/omitted.                               | Clinical narrative or patient PII exposed to admin.           |
| **CAN-15** | `POST /api/auth/logout`                          | Any Canary Account       | Execute logout.                                                        | HTTP 200 OK, `Set-Cookie: ... Max-Age=0`, subsequent requests return 401.                                       | Session remains active post-logout.                           |

---

## 4. Overall Canary Pass / Fail Criteria

- **CANARY PASS:**
  All 15 verification steps (CAN-01 through CAN-15) achieve `PASS` within expected response latency (<1500ms per request). No database deadlocks, no unhandled exceptions, zero data leakage, and zero session persistence failures.
- **CANARY FAIL:**
  Any single occurrence of:
  1. HTTP 500 / unhandled serverless isolate exception on any endpoint.
  2. Database consensus failure or D1 transaction deadlock.
  3. Failure of the 15-minute sliding idle timeout or session cookie issuance.
  4. Exposure of patient PII or clinical chronology to the `ADMINISTRATOR` role.
  5. Inability to generate sequential canonical report numbers (`IKP/IBS/YYYYMM/XXXX`).

---

## 5. Rollback / Abort Criteria

If the canary evaluation fails:

1. **Immediate Traffic Halting:** Revert Cloudflare Pages deployment to the previous verified release via Cloudflare Dashboard or Wrangler CLI (`npx wrangler pages deployment rollback`).
2. **Post-Mortem Initiation:** Export edge request logs matching the failure `X-Request-ID` and analyze root cause.
3. **Database Guard:** Production D1 forward-only migrations remain in place; database is not dropped.
