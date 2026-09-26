# Test Architecture

## 1. Principles

- Automated evidence is layered; E2E does not replace domain, API, or database tests.
- Every business/security test maps to an actual FR/BR identifier. The Blueprint names AC-01 through AC-05 collectively but does not individually map their five clauses; tests must not invent that mapping.
- Fixtures are synthetic and must not contain real patient, employee, incident, credential, or attachment data.
- Authorization tests exercise the API boundary, not only hidden UI controls.
- Migration and restore tests operate on isolated local/preview resources, never production.

## 2. Layers

| Layer                   | Scope                                                                                                                        | Primary tooling/direction                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Unit                    | Pure time, validation, state transition, permission, formatting, CSV-safety functions                                        | Vitest                                                            |
| Domain rules            | Commands and invariants without HTTP; workflow/addendum/revision/SLA                                                         | Vitest with in-memory/fake ports                                  |
| D1 integration          | Migrations, FK/CHECK/UNIQUE, transactions, indexes, repository queries, concurrency                                          | Local D1/Wrangler isolated database                               |
| API integration         | Pages Functions, cookies/CSRF, validation, errors, authorization, idempotency, caching                                       | Wrangler local/preview HTTP tests                                 |
| Component integration   | Forms, error summary, keyboard/focus, autosave/conflict UX                                                                   | React component test stack selected when UI phase starts          |
| E2E                     | Critical role workflows across real browser and Pages/D1 preview                                                             | Framework selected before Phase 04/05; do not install in Phase 02 |
| Accessibility           | Proposed WCAG 2.2 AA baseline plus keyboard/screen-reader review; owner approval required before treating it as a formal NFR | Automated tool plus manual protocol                               |
| Security                | Auth/session, IDOR/BOLA, CSRF, XSS, rate, upload/export, headers, redaction                                                  | API/E2E and targeted security tooling                             |
| PDF visual              | Formal layout, pagination, fonts, long content, grayscale, attribution                                                       | Approved golden reference and pixel/layout tolerance              |
| Performance/reliability | p95/p99 route/command load, D1 queries, failure/retry, restore                                                               | Approved workload/SLI and environment                             |

## 3. Requirements traceability

| Requirement                  | Required test evidence                                                                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01                        | Source behavior: Username/NIP login and 15-minute idle lock. Architecture controls tested separately under ADR-004/015/018: revocation, cookie/CSRF, reset, disablement, role change, enumeration resistance.                    |
| FR-02                        | Source behavior: complete incident input, draft save, formal submit. Architecture controls under ADR-005/012: ownership, autosave conflict, idempotency, no browser PHI persistence.                                             |
| FR-03                        | Source behavior: receive, verifier identity, four risk bands, high-risk initial note, conditional unit completion. Scoped authorization comes from ADR-003.                                                                      |
| FR-04                        | Source behavior: BIRU/HIJAU investigation, causes, recommendations/actions, dates, digital approval. Version immutability comes from ADR-006.                                                                                    |
| FR-05                        | Source behavior: completeness, RCA decision, allowed regrade, revision request, completion. Review cycles/version preservation come from ADR-002/006.                                                                            |
| FR-06                        | Source behavior: 48-hour calculation, badge, overdue reason, audit history. Exact boundary/timezone comes from ADR-009; addenda from BR-04/ADR-006; integrity level from ADR-007.                                                |
| FR-07                        | Source behavior: dashboard/filter, CSV, and candidate Form IKP PDF rendering. Accreditation/formal acceptance remains stakeholder-gated; formula-injection, cache, scoped export, and output audit are ADR-003/012/015 controls. |
| BR-01                        | Only active registered healthcare worker creates/submits; intermediary original-finder field behavior                                                                                                                            |
| BR-02                        | Own/unit/PMKP scope isolation; negative ID enumeration; safe logs/cache/export                                                                                                                                                   |
| BR-03                        | Incident-to-submission absolute duration; exact 48h on time; after boundary overdue and reason required                                                                                                                          |
| BR-04                        | Submitted clinical snapshot update rejection; append-only addendum; correction history                                                                                                                                           |
| BR-05                        | Initial grade only by scoped Kepala Ruangan; regrade only by PMKP                                                                                                                                                                |
| BR-06                        | Low-risk simple-investigation branch; high-risk mitigation/escalation branch; illegal cross-branch rejection                                                                                                                     |
| BR-07                        | Actor snapshot contains approved identity fields and server time; explicit intent; historical stability; PDF rendering after policy approval                                                                                     |
| BR-08                        | End date before start rejected; equal/after accepted                                                                                                                                                                             |
| BR-09                        | PMKP-only `COMPLETED`; unit-only exception tested only after objective KNC policy approval                                                                                                                                       |
| AC-01–AC-05 collective block | Validation, overdue marking, lock, BIRU/HIJAU dynamic investigation, and PDF e-paraf evidence as a group; individual IDs remain unassigned                                                                                       |

## 4. Mandatory negative authorization suite

For every role/resource/action matrix entry, verify allowed and denied scope. At minimum:

- reporter cannot read/edit another user's incident;
- submitted clinical data cannot be patched;
- cross-unit Kepala Ruangan access is concealed/denied;
- PMKP role without explicit scope cannot access a report;
- Administrator cannot read clinical content by default;
- guessed attachment/export/PDF identifiers do not bypass parent authorization;
- stale or deactivated sessions cannot act;
- illegal state transitions and actor-supplied identity/status/time are rejected;
- direct update/delete of audit, addendum, or submitted versions is impossible through application APIs.

## 5. Database and migration gates for Phase 03

1. Apply all migrations to an empty local D1 database.
2. Apply incrementally from every supported prior version.
3. Verify forward migration failure behavior and no silent partial schema.
4. Exercise each FK, CHECK, NOT NULL, and unique constraint.
5. Verify monthly report-number allocation under concurrent attempts.
6. Verify domain mutation plus audit transaction rollback/commit atomically; migration recovery itself follows forward-fix and backup/restore policy, not routine down migrations.
7. Inspect query plans for approved queue/report queries with realistic-volume synthetic fixtures.
8. Verify no production credentials or real data in seeds.

## 6. Time tests

Use fixed server clocks and explicit offsets. Cover:

- one millisecond before, exactly at, and one millisecond after 48 hours;
- Asia/Makassar input/display and UTC storage;
- malformed/missing/future incident time;
- server time rather than browser clock;
- draft/autosave not stopping the SLA;
- revision not resetting SLA;
- date-only BR-08 values without timezone drift.

## 7. Conditional D1/R2 tests

This suite is not a Phase 03 gate unless ADR-010 and ADR-014 are accepted. If attachments are approved, cover intent failure, upload failure, finalize failure, duplicate retry, checksum mismatch, type spoofing, quarantine/scanner failure, metadata-without-object, object-without-metadata, deletion retry, approved hold behavior, reconciliation, and download denial for every non-`AVAILABLE` state.

Unit-completion, branch-changing regrade, RCA handoff, post-completion addendum, hash-chain verification, and attachment scenarios are conditional. They become release gates only after the corresponding ADR/policy is accepted.

## 8. Security controls

- Headers on HTML, JSON, redirects, errors, PDF, CSV, and downloads.
- CORS same-origin/default-deny and approved preflight only.
- CSRF missing/invalid/cross-origin cases.
- Session fixation, idle, absolute expiry, rotation, logout-all, role/account changes.
- Login/reset throttling and uniform error behavior.
- Stored/reflected XSS payloads remain encoded.
- Request/body/file size limits.
- Logs/error tracking exclude PHI, credentials, cookies, tokens, and bodies.
- Cache does not retain authenticated clinical/output responses.

## 9. Accessibility

Automated checks are necessary but insufficient. Critical flows require keyboard-only completion, focus/error management, semantic groups/labels, screen-reader status, non-color risk labels, reduced motion, chart alternatives, responsive zoom/reflow, and contrast review.

## 10. PDF visual regression

Blocked until the official `Form IKP.pdf` version and acceptance tolerance are approved. Then establish versioned golden pages covering empty/long values, page breaks, fonts/logo, addenda, attribution, grayscale, browser/renderer determinism, and print margins. Do not use “100% identical” as an executable criterion without a defined comparison method.

## 11. Performance and reliability

Blueprint values (page ≤1.5 seconds, submission API ≤800 ms, uptime 99.5%) lack percentiles and measurement conditions. Stakeholders/operations must define:

- route/command and payload;
- p50/p95/p99 target;
- network/region/environment;
- data volume/concurrency;
- cold-start treatment;
- measurement window/exclusions;
- alert and error budget.

RPO/RTO and restore frequency remain stakeholder decisions. A backup claim passes only after a restore drill.

## 12. Release evidence

Each phase should produce machine-readable test results and a concise traceability report. Manual clinical/PDF acceptance records the reviewer, role, date, artifact version/hash, scenarios, result, and exceptions. Blueprint self-assessment is not test execution evidence.
