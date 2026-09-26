# Architecture Foundation

## Scope

Phase 01 creates the executable development foundation only. It does not implement authentication, RBAC, incident reporting, patient data, SLA, grading, investigation, PMKP review, audit trail, database schema, migrations, R2 uploads, or formal PDF generation.

## Frontend architecture

The application is a React 19 SPA built with Vite and strict TypeScript. The current structure is intentionally small:

```text
src/
├── components/
│   ├── layout/
│   └── ui/
├── lib/
├── routes/
├── styles/
├── types/
├── app.tsx
└── main.tsx
```

Feature directories are not created empty. They will be added when corresponding phases begin. This deviates from creating all target folders immediately, avoiding placeholder churn while preserving the intended feature-oriented direction.

### Routing strategy

`react-router` provides a browser router with:

- shared `AppLayout`;
- `/` foundation home;
- `/fondasi` toolchain status;
- wildcard 404 route.

Future route authorization must be enforced server-side as well as reflected in UI. The current routes contain no protected data.

### Components

shadcn/ui is source-owned in `src/components/ui`. Preset `b5J6fFrGq` resolves to:

- `base-nova` style;
- Base UI primitives;
- Mist base color;
- Teal theme;
- Tabler icons;
- Inter variable font;
- small radius.

Only `Button` was generated. Feature phases must inspect shadcn component documentation before adding further components.

## Dependency rationale

### Runtime

| Dependency                    | Rationale                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `react`, `react-dom`          | React 19 application runtime                                                                       |
| `react-router`                | SPA routing and nested layout                                                                      |
| `react-hook-form`             | Approved future form-state foundation; no business form yet                                        |
| `zod`                         | Approved future runtime validation foundation; no clinical schema yet                              |
| `date-fns`                    | Approved future date operations; SLA logic is not implemented                                      |
| shadcn-generated dependencies | Required by preset for Base UI primitives, variants, class merging, icons, font, and CSS utilities |

Axios, Redux, Zustand, TanStack Query, animation libraries, and chart libraries are intentionally absent.

### Development

- Vite and React plugin: build/dev server.
- Tailwind CSS v4 and `@tailwindcss/vite`: CSS-first styling.
- TypeScript 5.9: current stable version compatible with typescript-eslint; TypeScript 7 was not used because the current ESLint parser supports `<6.1.0`.
- ESLint flat config and TypeScript ESLint: static analysis.
- Prettier: one formatting strategy without additional formatter plugins.
- Vitest: unit/integration foundation using the Vite toolchain.
- Wrangler: project-local Cloudflare Pages development and validation.
- Cloudflare Workers types: compile-time Pages Functions types.

## Backend directory strategy

```text
functions/
├── _middleware.ts
└── api/
    └── health.ts
```

`functions/api/health.ts` is an infrastructure health endpoint only. It proves Pages Functions compilation without implementing a business API. `functions/_middleware.ts` establishes conservative baseline headers and no-store behavior for HTML.

Future business endpoints remain under `/api`. Shared business modules must not be placed in route handlers once domain implementation begins.

## Cloudflare strategy

`wrangler.jsonc` is the chosen current configuration format. It defines:

- Pages project name `sip-ikp`;
- build output `dist`;
- compatibility date `2026-09-26`;
- non-secret `APP_ENV` only.

### D1 and R2

Binding names are reserved:

- `DB`: Cloudflare D1;
- `R2_BUCKET`: private Cloudflare R2 bucket.

Real database IDs, database names, bucket names, account IDs, and secrets are not invented. Local development exposes emulated bindings through Wrangler CLI flags. Preview and production resources must be separate and approved before adding binding declarations.

No schema, migration, seed, query, upload, or object operation exists in this phase.

### Environment strategy

- Browser-visible config uses `VITE_*` and contains non-secrets only.
- Function metadata uses Wrangler `vars` only for non-sensitive values.
- Local secrets will use ignored `.dev.vars`.
- Production secrets will use Cloudflare encrypted variables.
- Preview and production bindings must point to separate resources.

## Design-system strategy

Tailwind CSS v4 uses CSS-first configuration in `src/styles/globals.css`; no `tailwind.config.js` exists. The shadcn preset owns the base semantic tokens. Phase 01 adds accessible named tokens for BIRU, HIJAU, KUNING, and MERAH.

Risk meaning is always paired with text and may not rely on color alone. The shell uses clinical teal, restrained surfaces, visible focus, semantic landmarks, a skip link, and reduced-motion safeguards. It intentionally avoids final dashboard design, gradients, glass effects, decorative animation, and clinical data.

## Testing strategy

Vitest is the lightweight unit/integration runner. A smoke test validates the shared class utility and proves the test command works. Future test layers:

1. unit tests for domain invariants;
2. Pages Functions/D1 integration tests;
3. component integration tests when forms exist;
4. E2E framework selected only when critical user flows are ready.

No E2E dependency is installed in Phase 01 to avoid premature weight. No fake clinical workflow or patient fixture exists.

## Quality strategy

Required local gates:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
npm run cf:validate
```

TypeScript uses project references for browser, Pages Functions, and Node configuration code. Strict options include `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `useUnknownInCatchVariables` where applicable.

## Security foundation

- Same-origin `/api` direction.
- No JWT or session implementation.
- No sensitive client storage.
- No secrets in client environment variables.
- Initial CSP, frame denial, permissions policy, referrer policy, MIME-sniffing protection, and no-store for HTML.
- Server authorization remains mandatory in future phases.

The CSP is a foundation, not a final production policy. It must be tested and refined when authentication, assets, uploads, reporting, and observability are introduced.

## Initialization decisions

1. npm is the sole package manager because the generated root lockfile is `package-lock.json`.
2. Node minimum is `22.12.0`, satisfying Vite 8 and Wrangler 4.
3. TypeScript 5.9 is pinned instead of TypeScript 7 because current typescript-eslint peer support is `<6.1.0`.
4. React Router 8 is used as the current stable SPA router.
5. Tailwind v4 uses `@tailwindcss/vite` and `@import "tailwindcss"`; no v3 config or directives.
6. shadcn preset `b5J6fFrGq` is retained exactly.
7. One shadcn component is installed to verify generation; bulk component installation is deferred.
8. Wrangler resource bindings remain local CLI placeholders until real Cloudflare resources are approved.
9. Vitest is installed; E2E tooling is documented but deferred.
10. Project-local AI skills and lock metadata are committed as developer guidance.

## Deviations from Product Blueprint

No Product Blueprint requirement was silently changed.

- The Blueprint names the final stack but not exact package versions; current compatible stable versions were selected.
- The target feature-folder list is not created as empty directories. Directories will appear with real feature code.
- D1/R2 bindings are reserved by name but not placed in production configuration because the Blueprint does not provide approved resources.
- The shell is deliberately minimal and is not the final dashboard.

## Phase 03 reversible harness extension

Phase 03 adds a disposable local D1 harness and infrastructure-only request/log/API test utilities. The harness uses isolated synthetic tables and is not the application schema. Candidate entities and blocked decisions are documented in `DATA-MODEL-CANDIDATE.md` and `DATA-MODEL-DECISION-MATRIX.md`.

Request IDs and baseline logging redaction are reusable infrastructure. They do not implement authentication, authorization, clinical APIs, or compliance certification.

## Remaining architecture decisions

The blockers documented in `docs/ARCHITECTURE-AUDIT.md` remain open, including canonical state transitions, IBS versus hospital-wide scope, session/revocation design, RBAC/ABAC, e-paraf policy, local draft policy, audit immutability, revision/addendum model, SLA time semantics, attachment security, print/export controls, retention, and recovery targets.
