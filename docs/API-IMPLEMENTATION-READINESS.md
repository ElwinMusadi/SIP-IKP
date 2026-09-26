# API Implementation Readiness

## 1. Status

Business APIs are **NOT READY**. `GET /api/health` remains an infrastructure endpoint. Phase 03 adds reusable test/request-correlation foundations only.

## 2. Readiness matrix

| API Area                 | Documentation              | Data Dependency                 | Decision Dependency                          | Ready           |
| ------------------------ | -------------------------- | ------------------------------- | -------------------------------------------- | --------------- |
| Health/infrastructure    | Implemented foundation     | None                            | None                                         | YES             |
| Request correlation      | Implemented baseline       | None                            | ADR-016 operational ownership later          | YES for harness |
| Safe application logging | Baseline redaction utility | None                            | Logging sink/retention pending               | YES for harness |
| Auth                     | Provisional                | users/session                   | ADR-004, ADR-018                             | NO              |
| User/role administration | Outline                    | users/assignments/units         | ADR-001, ADR-003, ADR-004                    | NO              |
| Incident draft/submit    | Outline                    | incident aggregate/snapshot     | ADR-002, ADR-005, ADR-006, Form traceability | NO              |
| Risk grading             | Outline only               | risk history                    | ADR-002; branch regrade pending              | NO              |
| Investigation            | Outline                    | investigation versions          | ADR-006                                      | NO              |
| PMKP                     | Outline                    | review cycles/revision requests | workflow/RCA/regrade decisions               | NO              |
| Addendum                 | PENDING POLICY             | addendum candidate              | authorship/lifecycle approval                | NO              |
| Complete by unit         | Disabled                   | workflow candidate              | KNC policy/oversight                         | NO              |
| Emergency MR correction  | Blocked                    | correction request candidate    | governance approval                          | NO              |
| Attachment               | Conditional                | D1 metadata + private R2        | ADR-010, ADR-014                             | NO              |
| Audit                    | Outline                    | audit-record candidate          | ADR-007, ADR-008                             | NO              |
| Export/PDF               | Outline                    | approved projection/template    | roles, masking, Form approval                | NO              |

## 3. Implemented harness capabilities

- validate/generate bounded `X-Request-ID`;
- attach request ID to Pages context and responses;
- use request ID in structured baseline logs;
- redact sensitive keys before application logging;
- assert status, headers, JSON body, and request ID in API tests;
- expose candidate concurrency expectations without creating a business endpoint:
  - missing `If-Match`: 428;
  - stale ETag: 412;
  - domain/version conflict: 409.

## 4. Missing before business handlers

1. Accepted ADRs and named approval evidence.
2. Accepted OpenAPI/equivalent schemas; the current API document is an outline.
3. Final D1 schema and migrations based on approved decisions.
4. Auth/session/CSRF lifecycle.
5. Endpoint-specific authorization and scope.
6. Workflow and PMKP/RCA/regrade/unit-completion semantics.
7. Addendum and correction policy.
8. Idempotency storage/TTL and ETag details.
9. Pagination/filter/export contracts.
10. Error catalog and sensitive-output cache policy per endpoint.

## 5. Test harness direction

Future handlers can use the existing helpers for basic HTTP assertions. API integration must run against Pages Functions/Wrangler with an isolated local D1 database. No placeholder route should simulate authentication, authorization, or business transitions before approval.
