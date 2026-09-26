# API Contract

## 1. Scope and authority

This document is a **proposed API architecture outline**, not an implementable wire contract. It defines conventions for future Pages Functions endpoints but intentionally does not provide finalized request/response schemas. `GET /api/health` is the only Phase 01 infrastructure endpoint and is not evidence that business APIs exist. Business handlers remain blocked until an accepted OpenAPI or equivalent contract exists.

The API is the authorization and validation boundary. Frontend types, route guards, and form validation are not sufficient security controls.

## 2. Base path and resource conventions

- Proposed business API base: `/api/v1`; it becomes authoritative only after ADR-012 and the endpoint-level OpenAPI contract are accepted.
- Infrastructure health may remain `/api/health` outside versioned business resources.
- Resource names use plural lowercase nouns and kebab-free path segments where practical, for example `/api/v1/incidents`.
- Use nested resources only when ownership is intrinsic, such as `/incidents/{incidentId}/addenda`.
- Consequential workflow transitions use explicit command subresources rather than unrestricted status patching, for example `/incidents/{id}/actions/submit`.
- Clients may never set arbitrary `status`, audit actor, server timestamp, or authorization scope.

Illustrative resources, not implemented endpoints:

```text
/api/v1/sessions
/api/v1/incidents
/api/v1/incidents/{incidentId}
/api/v1/incidents/{incidentId}/actions/{command}
/api/v1/incidents/{incidentId}/investigation-revisions
/api/v1/incidents/{incidentId}/investigation-revisions/{revisionId}
/api/v1/incidents/{incidentId}/pmkp-reviews
/api/v1/incidents/{incidentId}/addenda
/api/v1/incidents/{incidentId}/audit-events
/api/v1/incidents/{incidentId}/risk-decisions
/api/v1/users
/api/v1/role-assignments
/api/v1/master-data/{type}
```

Addendum creation, unit completion, branch-changing regrade, emergency-MR correction, RCA handoff, and attachment routes are **conditional capabilities**. They must not be exposed until their `STAKEHOLDER DECISION REQUIRED` ADRs are accepted. Investigation edits must address an explicit working revision ID and are allowed only while that revision is draft; submitted revisions are immutable.

## 3. HTTP semantics

- `GET`: read-only and safe.
- `POST`: create resource or execute a named domain command.
- `PATCH`: partial edit only where mutable fields are explicitly defined, primarily drafts/master data.
- `PUT`: avoid unless full replacement semantics are intended.
- `DELETE`: not used for submitted clinical/audit records. Draft/session/temporary-object deletion requires explicit policy.
- JSON uses `application/json; charset=utf-8`.
- Server timestamps use UTC RFC 3339 with milliseconds, such as `2026-09-26T07:54:11.123Z`.

## 4. Success responses

Single resource:

```json
{
  "data": {
    "id": "019...",
    "type": "incident"
  },
  "meta": {
    "requestId": "019..."
  }
}
```

Collection:

```json
{
  "data": [],
  "page": {
    "nextCursor": null,
    "hasMore": false
  },
  "meta": {
    "requestId": "019..."
  }
}
```

Do not return internal database errors, stack traces, authorization predicates, password/session material, or unrequested patient fields.

## 5. Error contract

Use `application/problem+json` with stable machine codes:

```json
{
  "type": "https://sip-ikp.example/problems/validation-error",
  "title": "Data permintaan tidak valid",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "Periksa field yang ditandai.",
  "instance": "/api/v1/incidents",
  "requestId": "019...",
  "errors": [
    {
      "path": "incidentDatetime",
      "code": "INVALID_DATETIME",
      "message": "Tanggal dan waktu insiden tidak valid."
    }
  ]
}
```

| HTTP | Code category                                                          | Use                                                                           |
| ---: | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
|  400 | `MALFORMED_REQUEST`                                                    | Invalid JSON/content type/syntax                                              |
|  401 | `AUTHENTICATION_REQUIRED`, `SESSION_EXPIRED`                           | No valid session; uniform login failure remains outside this detail           |
|  403 | `FORBIDDEN`                                                            | Actor authenticated but policy denies a known action where disclosure is safe |
|  404 | `RESOURCE_NOT_FOUND`                                                   | Missing resource or concealment of unauthorized object existence              |
|  409 | `VERSION_CONFLICT`, `INVALID_STATE_TRANSITION`, `IDEMPOTENCY_CONFLICT` | Domain conflict or reused key with different payload                          |
|  412 | `PRECONDITION_FAILED`                                                  | Supplied ETag is stale                                                        |
|  413 | `PAYLOAD_TOO_LARGE`                                                    | Request/upload exceeds approved limit                                         |
|  415 | `UNSUPPORTED_MEDIA_TYPE`                                               | Content/MIME not allowed                                                      |
|  422 | `VALIDATION_ERROR`, `BUSINESS_RULE_VIOLATION`                          | Field/cross-field rule failed                                                 |
|  428 | `PRECONDITION_REQUIRED`                                                | Required `If-Match` is absent                                                 |
|  429 | `RATE_LIMITED`                                                         | Rate/abuse limit; include safe retry metadata                                 |
|  500 | `INTERNAL_ERROR`                                                       | Sanitized unexpected error                                                    |
|  503 | `DEPENDENCY_UNAVAILABLE`                                               | D1/R2/platform temporarily unavailable                                        |

Error messages must not disclose account existence, records outside scope, SQL, R2 keys, secrets, or clinical content.

## 6. Request identity and correlation

- Accept a valid client request ID only under a documented header; otherwise generate a UUIDv7-equivalent server ID.
- Response header: `X-Request-ID`.
- Include `requestId` in success metadata and problem details.
- Propagate it to sanitized application/security logs and domain audit metadata.
- Never use a patient/report identifier as the request ID.

## 7. Authentication and CSRF

This section is **PROVISIONAL — ADR-004 approval required**. If server-side opaque sessions are accepted:

- Login returns no token in JSON; it sets the session cookie and supplies a CSRF token through an approved non-cookie response channel bound to that session.
- Session cookie is opaque, HttpOnly, Secure, host-only, and SameSite Strict per `SECURITY-ARCHITECTURE.md`.
- State-changing requests send the CSRF token in a custom header and pass Origin/Fetch Metadata validation.
- Rotate session and CSRF material after login, password reset/change, privilege/assurance change, and other approved security events.
- Idle and absolute expiry, revoke-one/revoke-all, concurrent-session limits, and Remember Me remain blocked until ADR-004 approval.
- No credentials or bearer tokens in localStorage, query parameters, or response JSON.
- Authentication does not imply authorization. Every handler invokes central policy using current server-side assignments.

If stakeholders retain JWT/hybrid architecture, this section must be replaced by its accepted cookie/token lifecycle before OpenAPI approval.

## 8. Validation

Validation layers:

1. request size, content type, and JSON parsing;
2. Zod transport schema;
3. canonicalization and cross-field domain validation;
4. authorization and state transition validation;
5. D1 constraints and optimistic version check.

Unknown fields should be rejected for mutation DTOs. Draft validation may be partial, but submit commands run full validation. Server derives actor IDs, status, audit snapshots, and timestamps.

## 9. Pagination, filtering, and sorting

- Prefer opaque cursor pagination for incident/audit/task collections.
- Default and maximum page sizes must be bounded; recommendation: default 25, maximum 100, subject to query testing.
- Cursor binds stable sort tuple, filters, and actor scope; clients may not edit its contents.
- Every list has deterministic secondary ordering by ID.
- Filter allowlists match indexed fields; reject arbitrary SQL-like filters.
- Date filters use explicit UTC instants or date-only hospital-zone semantics.
- Sort fields/directions are allowlisted. No free-form column names.
- Exports are separate bounded operations, not an unbounded `pageSize` bypass.

## 10. Concurrency and idempotency

### Optimistic concurrency

Mutable resources expose an integer `version` and a strong ETag derived from resource ID/version. State-changing commands require `If-Match`; missing preconditions return `428 PRECONDITION_REQUIRED`, stale ETags return `412 PRECONDITION_FAILED`, and domain conflicts that are not HTTP precondition failures return `409 VERSION_CONFLICT`/`INVALID_STATE_TRANSITION`. Successful reads/mutations return the current ETag/version.

### Idempotency

Require `Idempotency-Key` for commands vulnerable to double submission/retry:

- formal report submission;
- receive/grade/escalate;
- investigation submit/resubmit;
- PMKP completion/revision request;
- addendum creation;
- export generation;
- attachment upload finalization.

Store actor, route/command, normalized request hash, result reference, and expiry. Same key/same payload returns the original result; same key/different payload returns `409 IDEMPOTENCY_CONFLICT`.

## 11. Workflow command rules

- Use the transition matrix in `WORKFLOW-STATE-MACHINE.md`.
- A command transaction includes mutation/version insertion, state change, attribution, and audit event.
- API handlers must not accept generic `PATCH { status: ... }`.
- `REVISION_REQUIRED` creates a revision request; resubmission creates a new investigation version and returns to `SUBMITTED_TO_PMKP`.
- PMKP completeness `TIDAK` permits revision only; completeness `YA` plus further RCA `TIDAK` may permit completion; further RCA `YA` is blocked until a handoff/lifecycle is approved.
- Branch-changing regrades are blocked until their required follow-up transitions are approved.
- Addenda are separate append-only resources only after authorship/lifecycle policy is accepted.

## 12. Authorization contract

Policy inputs:

```text
actor(user, active assignments, authentication assurance)
resource(owner, unit, status, version, classification)
action(command/read/export)
request context
```

The API enforces `RBAC-MATRIX.md`. D1 queries include scope predicates. Attachment, audit, PDF, print, and export authorization inherit the parent incident policy plus their own action permission.

## 13. Caching and sensitive output

- Sensitive API responses: `Cache-Control: no-store, private`.
- Never cache authenticated patient data at public/CDN/shared caches.
- Health response may use short non-sensitive caching only if operations approves it; current foundation uses no-store.
- Downloads use safe `Content-Disposition`, `X-Content-Type-Options: nosniff`, authorization, short-lived delivery, and audit.

## 14. Versioning and deprecation

`/api/v1` is the compatibility boundary. Additive fields should not break clients. Breaking schema or semantics require a new version or a coordinated migration. Deprecations require documentation, telemetry without PHI, and an announced removal window.

## 15. OpenAPI and tests

Before implementing any business endpoint, create and accept an OpenAPI contract or equivalent machine-readable source covering every endpoint's request/response schema, required/optional fields, enums, field date/time formats, authorization scope, `If-Match`, `Idempotency-Key`, problem details, cookie/CSRF behavior, filters/sorts, pagination cursor semantics, compatibility, and deprecation. Generate no client until the contract is stable. This prose outline alone is not sufficient for handler implementation.

Required API tests:

- positive/negative authorization for every RBAC row;
- illegal workflow transitions;
- stale version and idempotent retry;
- validation and error-shape stability;
- cache/security headers;
- cross-unit/object-ID enumeration resistance;
- sanitization of errors and logs.

## 16. Related requirements

- FR-01 through FR-07
- BR-01 through BR-09
- AC-01 through AC-05 collectively, because the Blueprint does not individually map their statements
