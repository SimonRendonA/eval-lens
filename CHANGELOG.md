# Changelog

All notable changes to EvalLens are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/0.1.1/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [0.1.1] — 2026-04-14

### Added

#### Failure Analysis (self-hosted only)
- New **Failure Analysis** panel in the results view — triggers an AI-generated narrative that identifies distinct failure patterns, groups affected rows with example IDs, and provides a single concrete recommended next step.
- New `POST /api/narrative` route — validates self-hosted mode, resolves the provider via `createProviderFromEnv`, builds the prompt with `buildNarrativePrompt`, and returns a structured `NarrativeResponse`.
- New `src/lib/narrative/` module — `generator.ts` (prompt builder + response parser), `types.ts` (`NarrativeStatus`, `NarrativeRequest`, `NarrativeResponse`, `NarrativePattern`), and `index.ts` re-export surface.
- `triggerNarrative()` action and `narrativeStatus` / `narrative` / `narrativeError` state added to `useEvaluation`.
- `NarrativePanel` component — renders idle, loading, success (summary, pattern list, recommendation block), and error states.

#### Mode-aware exports — all four formats
- `ExportMeta` type extended with `mode`, `fileName`, `isSample`, `outputSource`, `generatedRowCount`, `provider`, `model`, and `narrative`.
- **CSV** — comment header block always present; self-hosted adds provider, model, generated row count; narrative summary, patterns, and recommendation appended when available.
- **JSON** — `meta` block always present; optional `failureAnalysis` field added when narrative is available.
- **Markdown** — new sections: Run Context table, Highlights table, Failure Analysis + Patterns + Recommended Next Step (when narrative present).
- **PDF** — overhauled layout: branded overview banner, two-column run context panel, full failure detail snapshot (no row limit, no value truncation), row results table with wrapped failure text, paginated narrative section with recommendation box.

#### Self-hosted provider abstraction
- `createProviderFromEnv(id, env)` — resolves API key from environment, throws if missing.
- `getAvailableProviderById(env, id)` — returns a single `AvailableProvider` by ID.
- Narrative route uses these helpers instead of its own key map.

#### Runtime mode gating (Docker-safe)
- `NEXT_PUBLIC_EVALLENS_MODE` build-time variable removed from `next.config.ts`.
- Client now reads mode from `GET /api/config` at runtime; `ResultsStep` receives `mode` as a prop.
- A single Docker image can run in either mode via the `EVALLENS_MODE` environment variable injected at container start — no rebuild required.

### Changed

- `ResultsStep` accepts a `mode` prop instead of reading a build-time env variable.
- `useEvaluation` now tracks `selectedProvider`, `selectedModel`, and `generatedRowCount` for export metadata.
- `selectedProvider` defaults to the first configured provider returned by `/api/config` on mount.
- Landing page "How it works" updated: **04 — Analyse** step card added; self-hosted feature cards updated; "AI failure analysis" tag chip added.
- README updated: new How It Works steps, Export Formats section, Self-Hosted Flow, project structure diagram.
- ARCHITECTURE.md updated: Step 6 (Failure Analysis), Export section with `ExportMeta` type, `POST /api/narrative` route, updated architecture diagram and Key Design Decisions.


---

## [1.0.0] — initial release

- Hosted evaluation mode: upload CSV or JSONL with `expected` + `actual` columns and get a scored, filterable result.
- Self-hosted mode: generate missing `actual` outputs via OpenAI, Anthropic, or Gemini before evaluating.
- Failure taxonomy: `UNPARSEABLE`, `SCHEMA_MISMATCH`, `MISSING_FIELD`, `WRONG_TYPE`, `EXTRA_FIELD`, `WRONG_VALUE`.
- Row inspector side panel with raw expected/actual JSON diff view.
- Export: CSV, JSON, Markdown, PDF.
- Docker support with `output: "standalone"` and runtime environment variable injection.
- Sample datasets included under `public/samples/`.
