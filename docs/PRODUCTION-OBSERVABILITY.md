# Production Observability and Incident Diagnosis Guide

## 1. Observability Architecture Overview

The **Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang** employs a privacy-first, structured observability architecture tailored for Cloudflare Pages Functions and Cloudflare D1.

**CORE TENET:** Production logs are designed to diagnose performance, system errors, and authentication failures without ever storing or leaking sensitive medical narratives, patient identities, or authentication credentials.

---

## 2. Request Correlation via `X-Request-ID`

Every HTTP interaction through the application is assigned a unique, bounded Request ID:

1. **Header Name:** `X-Request-ID`
2. **Format:** 8–64 character alphanumeric string (or UUIDv4/v7).
3. **Propagation:**
   - Generated or validated by `functions/_middleware.ts`.
   - Propagated to the Cloudflare execution context (`data.requestId`).
   - Attached to every HTTP response header.
   - Embedded into JSON success payloads (`meta.requestId`) and RFC 9457 Problem Details (`requestId`).
   - Recorded in every domain audit entry (`audit_records.request_id`).
4. **Diagnostic Value:** When a clinician reports an issue (e.g., error message on screen), the operator requests the displayed `ID Jejak / Request ID`. Operators can grep Cloudflare Pages logs for this exact identifier to retrieve the full execution trace.

---

## 3. What is Logged vs. What is Redacted

### What IS Logged in Application Observability:

- **Request Completion:**
  - `event`: `"request.completed"`
  - `requestId`: The request correlation ID.
  - `timestamp`: UTC ISO 8601 timestamp.
  - `method`: HTTP method (`GET`, `POST`, `PATCH`, `DELETE`).
  - `path`: URL pathname template (e.g. `/api/incidents/019.../submit`).
  - `status`: HTTP response status code (e.g. `200`, `401`, `403`, `412`, `422`, `500`).
  - `durationMs`: Total execution latency in milliseconds.
- **Unhandled Exceptions:**
  - `event`: `"request.unhandled_error"`
  - `requestId`: Request correlation ID.
  - `method` & `path`.
  - `errorName`: JavaScript error class name (e.g. `D1Error`, `TypeError`).
- **Session Anomalies:**
  - `event`: `"session.validation_error"`
  - `requestId`.

### What is STRICTLY REDACTED:

Under `functions/_shared/log-redaction.ts`, any object or header containing the following keys is automatically sanitized to `"[REDACTED]"`:

- **Authentication Secrets:** `authorization`, `cookie`, `setcookie`, `password`, `passwordhash`, `session`, `sessionid`, `sessiontoken`, `csrftoken`, `token`, `refreshtoken`.
- **Patient Identifiers (PHI):** `patientname`, `medicalrecordnumber`, `mrnumber`.
- **Clinical Narratives:** `chronology`, `chronologynarrative`, `immediateactionandresult`, `highriskmitigationnotes`, `directcause`, `underlyingrootcause`.
- **Storage Artifacts:** `r2storagekey`, `objectkey`.

---

## 4. Operator Runbook for Production Incident Diagnosis

When diagnosing operational anomalies, operators should inspect Cloudflare Pages real-time logs via Wrangler:

```bash
npx wrangler pages deployment tail --project-name sip-ikp
```

### Common Diagnostic Scenarios:

| Error Symptom                         | HTTP Status | Log Pattern to Search                         | Primary Diagnostic Cause                                                | Operator Resolution                                                         |
| ------------------------------------- | ----------- | --------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Clinician locked out during shift** | `401`       | `"status": 401` with path `/api/auth/session` | 15-minute sliding idle timeout elapsed without API activity.            | Normal clinical security behavior; advise clinician to log back in.         |
| **Mutating action rejected**          | `403`       | `"code": "CSRF_TOKEN_INVALID"`                | Anti-CSRF token missing or session expired in another tab.              | Advise user to refresh browser to synchronize active session token.         |
| **Concurreny edit rejected**          | `412`       | `"code": "PRECONDITION_FAILED"`               | Another clinical supervisor modified the report concurrently.           | Advise user to refresh and inspect the updated report version.              |
| **Form submit rejected**              | `422`       | `"code": "MANDATORY_FIELDS_INCOMPLETE"`       | A required field in Bagian I or II was left blank.                      | Check client validation errors list returned in problem details response.   |
| **SLA Overdue without reason**        | `422`       | `"code": "OVERDUE_REASON_REQUIRED"`           | Incident occurred > 48h ago but overdue reason was omitted.             | Ensure user fills in "Alasan Keterlambatan Pelaporan".                      |
| **Emergency correction blocked**      | `403`       | `"status": 403` on `/emergency-correction`    | Attempted correction after Simple Investigation or PMKP review started. | Normal governance rule (Decision #181); emergency correction is locked.     |
| **Database error**                    | `500`       | `"code": "DATABASE_UNAVAILABLE"`              | Cloudflare D1 binding disconnected or regional outage.                  | Verify D1 binding in Cloudflare Dashboard and check Cloudflare status page. |
