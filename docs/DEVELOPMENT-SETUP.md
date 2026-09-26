# Development Setup

## Prerequisites

| Tool             | Required/verified                                             |
| ---------------- | ------------------------------------------------------------- |
| Operating system | Windows 11 verified; commands are cross-platform unless noted |
| Node.js          | `>=22.12.0`; verified with `v24.21.0`                         |
| npm              | Verified with `11.6.4`                                        |
| Git              | Verified with `2.50.1.windows.1`                              |
| Wrangler         | Project-local `4.141.0`                                       |

Vite 8 requires Node `^20.19.0 || >=22.12.0`; Wrangler 4 requires Node `>=22.0.0`.

## Installation

```bash
npm install
```

The root `package-lock.json` is the reproducible dependency lock. Do not use a second package manager.

## Application commands

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run lint
npm test
npm run test:watch
npm run format:check
npm run format
```

- `npm run dev` starts Vite for frontend development.
- `npm run build` runs TypeScript project references and creates `dist/`.
- `npm run preview` serves the production build locally.
- `npm test` runs the lightweight Vitest smoke suite once.

## Cloudflare local development

`wrangler.jsonc` defines the Pages project metadata and non-secret `APP_ENV`. Real D1/R2 resources are intentionally not declared because production/preview IDs and bucket names have not been approved.

For local binding emulation:

```bash
npm run cf:dev
```

This command builds the frontend and launches Pages locally with:

- D1 binding: `DB`
- R2 binding: `R2_BUCKET`
- persisted local state under ignored `.wrangler/`

The local API health endpoint is:

```text
GET /api/health
```

It does not read D1 or R2 and does not expose secrets.

Validate the Functions bundle:

```bash
npm run cf:validate
```

Generate Cloudflare environment types after approved bindings are added to `wrangler.jsonc`:

```bash
npm run cf:types
```

Do not deploy until real resource names/IDs and preview/production separation are approved. `wrangler.jsonc` becomes a configuration source of truth for Pages deployment.

## Disposable local D1 harness

Phase 03 provides a non-production harness only. It uses `wrangler.d1-harness.jsonc`, has no remote database ID, and stores disposable state under ignored `.tmp/phase-03-d1`.

```bash
npm run d1:harness:setup
npm run d1:harness:seed
npm run d1:harness:reset
npm run d1:harness:teardown
npm run d1:harness:validate
```

The SQL under `test-support/d1/candidate/` is not a production migration. Never add `--remote`, production identifiers, or real patient/employee data. Harness fixtures use `TEST`/`SYNTHETIC` markers and can be deleted without migration rollback.

## Environment variables

Copy only public, non-secret values from `.env.example` when needed. Values prefixed with `VITE_` are included in client code and must never contain secrets.

Local server secrets, when introduced in a later phase, belong in ignored `.dev.vars` files. Production secrets belong in Cloudflare encrypted variables. Do not create or commit real `.env` or `.dev.vars` files.

## shadcn/ui

The project uses Product Blueprint preset `b5J6fFrGq`:

- framework: Vite;
- Tailwind: v4;
- style: Nova;
- primitive base: Base UI;
- color: Mist/Teal;
- icons: Tabler;
- font: Inter.

Inspect current state:

```bash
npx shadcn@latest info
```

Only the `button` component is installed because the foundation shell needs a basic action primitive. Add later components only when a feature requires them.

## AI skills

Project-local skills are documented in `docs/AI-SKILLS.md`. Verify or restore them with:

```bash
npx skills list --json
npx skills experimental_install
```

## Security notes

- Do not put patient data, credentials, tokens, database IDs, or bucket credentials in source.
- Do not persist sensitive data in `localStorage`.
- Prefer same-origin `/api` calls.
- Authentication, authorization, D1 schema, R2 operations, and clinical workflow are intentionally absent.
