<!--
CLAUDE.md — operational guide for Claude Code in this repo.
Short by design. Architecture lives in ARCHITECTURE.md; don't duplicate.
Last reviewed at bottom — update quarterly.
-->

# EvalLens

Evaluation tool for structured LLM outputs. Next.js 16 + TypeScript + Tailwind +
shadcn/ui. Two-layer architecture: `src/lib/` is pure TS with zero React
dependencies; `src/app/` is the UI layer. The two communicate through
`useEvaluation` (React hook).

## Read this first

**For how the product works** → `ARCHITECTURE.md`. It is the source of truth for
the pipeline, failure taxonomy, module boundaries, and API routes. Do not
duplicate its content here. Read it before making changes that cross module
boundaries.

**For Next.js 16 conventions** → `AGENTS.md` and `node_modules/next/dist/docs/`.
Next 16 has breaking changes versus earlier versions. **Training data lies.**
Before writing any Next.js code, read the relevant doc under
`node_modules/next/dist/docs/`. If unsure which doc is relevant, use the
`nextjs-16-verifier` subagent.

---

## Commands

| Task | Command |
|---|---|
| Install deps | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Start production build | `npm run start` |
| Lint | `npm run lint` |
| Lint + autofix | `npm run lint -- --fix` |
| Typecheck | `npx tsc --noEmit` |
| Run all tests | `npm test` |
| Run tests once (CI mode) | `npm run test:run` |
| Run one test file | `npx vitest run <path>` |
| Docker build | `docker build -t evallens .` |
| Docker compose up | `docker compose up` |

---

## Conventions

- **Respect the two-layer split.** Code in `src/lib/` must not import from
  `src/app/` or from React. If a library function needs UI state, the UI layer
  passes it in. This is enforced by code review, not tooling — do not break it.
- **Pure functions in `src/lib/`.** Inputs → outputs. No side effects except at
  explicit I/O boundaries (file reads, network, stdout).
- **Co-located tests.** `foo.ts` has `foo.test.ts` next to it. Vitest picks
  them up automatically.
- **TypeScript everywhere.** No `.js` in source. Types live next to the thing
  they describe.
- **shadcn/ui primitives.** Use `components/ui/*`, not raw Radix. New
  primitives via `npx shadcn@latest add <component>`.
- **Tailwind v4.** Config in `tailwind.config.ts`; uses the new `@tailwindcss/postcss` plugin. Old v3 patterns may not apply.
- **Client components marked explicitly.** `"use client"` at the top when using
  hooks or interactivity.
- **File naming.** Components `PascalCase.tsx`. Everything else `camelCase.ts`.
  Next.js routes follow its conventions (`page.tsx`, `route.ts`, `layout.tsx`).

---

## Gotchas

- **Next.js 16 breaking changes.** App Router APIs, route handler signatures,
  and conventions may differ from training data. Read the docs in
  `node_modules/next/dist/docs/` before writing route handlers, layouts, or
  middleware. Prefer asking the `nextjs-16-verifier` subagent to confirm an
  API exists as you remember it.
- **`EVALLENS_MODE` gates features at runtime, not build time.** Hosted mode
  exposes no provider UI, self-hosted exposes provider selection, generation,
  and failure analysis. The client learns the mode via `GET /api/config` on
  mount. When touching features, check which mode they belong to — breaking
  hosted by assuming self-hosted context is easy.
- **Three AI providers (OpenAI, Anthropic, Gemini).** Any code path that
  touches providers must remain provider-agnostic via `createProvider` or
  `createProviderFromEnv`. Do not hardcode a provider.
- **AI calls cost money.** `/api/generate` and `/api/narrative` hit real
  providers. Never invoke them in loops, tests, or dev scripts without explicit
  care. Mock at the provider boundary when testing.
- **SSE streaming in `/api/generate`.** Don't refactor it into JSON
  request/response without understanding why streaming exists (progressive UI
  updates for long runs).
- **Structural failures block value comparison.** If a field fails
  `WRONG_TYPE`, the evaluator intentionally skips `WRONG_VALUE` for that field.
  Don't "fix" this — it's correct behavior (see ARCHITECTURE.md).
- **Failure analysis samples up to 20 rows.** Don't pass the full failed-row
  set to the prompt naively — `buildNarrativePrompt` handles sampling.
- **`.env.local` has real API keys.** Never log, commit, or paste its contents
  into Claude context.
- **`test.txt` at repo root.** Appears to be a scratch file. Safe to ignore or
  delete.
- **Duplicate key design decision in ARCHITECTURE.md.** The "`actual` defaults
  to `""`" block is duplicated (lines 353 and 355 at last check). Low-priority
  cleanup task.

---

## Out of bounds

- `.env*` — secrets.
- `node_modules/`, `.next/` — generated.
- `package-lock.json` — managed by npm.
- `components/ui/*` — managed by shadcn CLI unless intentionally customizing.
- `CHANGELOG.md` — **only edit via `/release`** (see Working agreements).
- `package.json`'s `version` field — **only edit via `/release`**.
- `Dockerfile` / `docker-compose.yml` — production deployment surface; touch
  with care and test Docker build before committing.
- `.github/` — CI config; changes need deliberate review.

---

## External context

- **Live site:** https://rendonarango.com/eval-lens (hosted mode)
- **Source:** this repo
- **Related:** `rendonarango.com` (portfolio, separate repo; embeds/links to
  EvalLens)
- **Architecture:** see `ARCHITECTURE.md` at repo root
- **Contributing:** see `CONTRIBUTING.md`
- **Security:** see `SECURITY.md`
- **Changelog:** `CHANGELOG.md` (managed via `/release`)

---

## Versioning policy

Pre-1.0. API is explicitly unstable. The version number is informational, not
a compatibility contract.

- **Minor bumps** (`0.N.0`) may contain breaking changes. Document them in the
  `### Changed` and `### Removed` sections.
- **Patch bumps** (`0.N.P`) are for fixes and backward-compatible additions.
- `1.0.0` will be a deliberate, announced release — not an accidental increment.
  Do not bump to `1.0.0` without explicit confirmation.

`/release` enforces this. It will not promote to `1.0.0` without an explicit
flag and a confirmation prompt.

---

## Working agreements

- **Never push to `main`.** All changes go via feature branch + PR. A
  `PreToolUse` hook enforces this at the tool level; do not try to work around
  it.
- **Branch naming.** `<type>/<short-kebab-desc>` per the global `git-workflow`
  skill. Use the `/new-branch` project command to create branches correctly.
- **Commit messages.** Conventional Commits (see global `git-workflow` skill).
- **Before declaring a task done:**
  1. `npm run lint` — fix anything surfaced.
  2. `npx tsc --noEmit` — zero errors.
  3. `npm run test:run` — all green.
- **Versioning.** Semver. Currently pre-1.0, so minor bumps are allowed to
  contain breaking changes. **Only the `/release` command updates `package.json`'s
  version and `CHANGELOG.md`.** Do not hand-edit either.
- **Releasing.** Use `/release`. It bumps the version, writes a changelog
  entry matching Keep a Changelog format, creates a release branch, and opens
  a PR. Do not merge release PRs without a human read-through.
- **When in doubt on Next.js 16 API usage**, invoke the `nextjs-16-verifier`
  subagent before writing the code.
- **Failing tests do not mean "fix the test."** Understand which side is wrong
  first.

---




_Last reviewed: 2026-04-17_