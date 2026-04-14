# How EvalLens Works

A technical walkthrough of the data flow, from file upload to results.

---

## The Big Picture

EvalLens takes a file where each row contains an **expected** JSON output and an **actual** JSON output, then tells you exactly why each row passed or failed.

The codebase is split into two distinct layers:

- **`src/lib/`** — a pure TypeScript engine with no UI dependencies. It can run anywhere: a browser, a server, or a CLI.
- **`src/app/`** — a Next.js UI layer that orchestrates the engine and renders the results.

These layers communicate through a single React hook (`useEvaluation`) that acts as the app's state machine.

---

## The Five Steps

The app walks users through a linear pipeline. Each step maps to a state in the hook and a component on screen.

```
upload → schema → [generating] → evaluating → results
```

The `generating` step only appears in self-hosted mode when the file has no `actual` column. Within the `results` step, users can optionally trigger **Failure Analysis** (self-hosted only), which makes an additional API call and renders the narrative inline.

---

## Step 1 — File Upload

**What the user does:** Drops a `.csv`, `.jsonl`, or `.json` file onto the page.

**What happens in code:**

1. The browser reads the file as a text string.
2. `parseFile(content, filename)` in `src/lib/parsers/index.ts` looks at the file extension and calls either `parseCsv` or `parseJsonl`.
3. Both parsers return the same shape:

```ts
{ rows: RawDatasetRow[], errors: ParseError[] }
```

A `RawDatasetRow` keeps everything as strings:

```ts
type RawDatasetRow = {
  id: string;
  prompt: string;
  expected: string; // raw JSON string, e.g. '{"name":"Alice"}'
  actual: string;   // raw JSON string, or "" if the column is absent
}
```

The `errors` array holds **non-fatal** problems — rows that were skipped because they had a missing field. Fatal problems (like a CSV with no `expected` column) throw an exception, which the hook catches and displays as an error banner.

4. The hook stores the rows and moves to the `schema` step.

---

## Step 2 — Schema Inference

**What the user sees:** A table showing the fields EvalLens found in the `expected` column, their types, and whether they're required.

**What happens in code:**

`inferSchema(rows)` in `src/lib/schema/infer.ts` scans every row's `expected` string:

1. JSON-parses each `expected` value (throws if any is not a valid JSON object).
2. Collects every unique key seen across all rows.
3. For each key:
   - **Type** is detected from the first row that contains that key.
   - **Required** is `true` only if the key appears in *every* row.

```ts
// Example output for a dataset where all rows have "name" but only some have "role"
{
  fields: [
    { name: "name", type: "string", required: true },
    { name: "role", type: "string", required: false },
  ]
}
```

This schema is stored in the hook and used as the contract for every subsequent evaluation.

The user reviews the schema, then clicks Confirm to continue.

---

## Step 3 — Generation (self-hosted only)

This step is skipped entirely in hosted mode.

**When it appears:** The `actual` column was absent from the file *and* the server is running in self-hosted mode (checked via `/api/config`).

**What happens in code:**

1. The user picks an AI provider (OpenAI, Anthropic, or Gemini) and a model from the UI.
2. The hook calls `generateWithStream(rows, providerId, model, callbacks)` in `src/lib/generate-stream.ts`.
3. That function POSTs to `/api/generate` with the list of rows that need generation.

The server-side route (`src/app/api/generate/route.ts`) processes rows one by one:
- Looks up the provider using `createProvider(id, apiKey)`.
- Calls `provider.generateOutput(prompt, model)` for each row.
- Streams each result back as a **Server-Sent Event (SSE)**:

```
data: {"id":"1","prompt":"...","actual":"{\"name\":\"Alice\"}","index":0,"total":5}

data: {"id":"2","prompt":"...","actual":"{\"name\":\"Bob\"}","index":1,"total":5}

data: {"done":true}
```

Back on the client, `generateWithStream` reads the stream chunk by chunk, parsing each `data:` line as JSON. It calls:
- `onProgress(index, total, row)` for each row → the UI updates the progress bar
- `onComplete(rows)` when the `done` event arrives → the hook merges the generated `actual` values back into `rawRows` and proceeds

After merging, every row has a non-empty `actual` string, and the pipeline continues to evaluation.

---

## Step 4 — Evaluation

**What the user sees:** A spinner while processing runs.

**What happens in code:**

`evaluateDataset(rows, schema)` in `src/lib/evaluator/evaluate-dataset.ts` maps `evaluateRow` over every row, then aggregates the results into a `Summary`.

### How a single row is evaluated

`evaluateRow(row, schema)` in `src/lib/evaluator/evaluate-row.ts` runs in four stages:

**Stage 1 — Parse expected**
```ts
JSON.parse(row.expected)
```
If this throws, the row immediately fails with `UNPARSEABLE` and evaluation stops.

**Stage 2 — Parse actual**
```ts
JSON.parse(row.actual)
```
Same — `UNPARSEABLE` on failure and stops.

**Stage 3 — Structural checks**
`validateAgainstSchema(actual, schema)` in `src/lib/schema/validate.ts` checks three things:

| Failure | Condition |
|---------|-----------|
| `MISSING_FIELD` | A required schema field is not present in `actual` |
| `WRONG_TYPE` | A field is present but its JavaScript type doesn't match the schema |
| `EXTRA_FIELD` | `actual` contains a key that isn't in the schema at all |

**Stage 4 — Value comparison**
For every field that *passed* the structural checks, the evaluator compares the value in `expected` vs `actual`:
- Objects and arrays: compared via `JSON.stringify` (order-sensitive)
- Primitives: compared with strict `===`

A mismatch produces a `WRONG_VALUE` failure.

Fields that already have a structural failure (`MISSING_FIELD`, `WRONG_TYPE`) are **skipped** here — there's no point reporting both "wrong type" and "wrong value" for the same field.

### The failure taxonomy

```
UNPARSEABLE  → actual (or expected) is not valid JSON
MISSING_FIELD → required field is absent
WRONG_TYPE   → field exists but has the wrong type
EXTRA_FIELD  → unexpected field present in actual
WRONG_VALUE  → field is structurally correct but the value differs
```

### The result shape

```ts
// Single row
{ id: "1", status: "fail", failures: [
  { reason: "WRONG_VALUE", field: "name", expected: "Alice", actual: "Bob" }
]}

// Dataset summary
{
  summary: {
    total: 100, passed: 82, failed: 18,
    passRate: 0.82,
    failureReasons: { WRONG_VALUE: 12, MISSING_FIELD: 4, UNPARSEABLE: 2, ... }
  },
  rowResults: [ ... ]
}
```

---

## Step 5 — Results

**What the user sees:** Summary cards, a filterable table, a side panel inspector, an export menu, and — in self-hosted mode — a **Failure Analysis** panel.

**What happens in code:**

The `ResultsStep` component in `src/app/components/results-step.tsx` receives the `EvaluationResult` object and renders it entirely client-side. No further processing happens — the data is already fully computed.

Filtering is local React state:
- A `statusFilter` (`"all"` / `"pass"` / `"fail"`) narrows the table rows
- A `failureFilter` further narrows by specific failure reason

Clicking a row opens `RowInspector`, a slide-out sheet that shows the raw expected and actual JSON side by side, plus the list of failures for that row.

---

## Step 6 — Failure Analysis (self-hosted only)

**What the user sees:** An "Analyse failures" button in the results panel. On click, it enters a loading state and then renders a narrative: a summary paragraph, a list of named failure patterns (each with a description, affected row count, and example row IDs), and a recommended next step.

**What happens in code:**

1. `triggerNarrative()` in `useEvaluation` collects all failed rows from the current result and POSTs them to `/api/narrative`.
2. The route validates the request, checks `EVALLENS_MODE === "self-hosted"`, resolves the provider and API key using `createProviderFromEnv`, and calls `buildNarrativePrompt(failedRows)` from `src/lib/narrative/generator.ts`.
3. The prompt samples up to 20 representative failed rows and asks the model to identify failure patterns.
4. The response is parsed by `parseNarrativeResponse(text)` which strips markdown fences and validates the JSON shape into a `NarrativeResponse`.
5. The hook stores the result in `narrative` state and surfaces it to `NarrativePanel` via `ResultsStep`.

The `NarrativeResponse` shape:

```ts
type NarrativeResponse = {
  summary: string;
  patterns: NarrativePattern[];
  recommendation: string;
};

type NarrativePattern = {
  title: string;
  description: string;
  affectedCount: number;
  exampleIds: string[];
};
```

---

## Export

The export menu lets users download results in four formats. All exports are generated entirely in the browser from the `EvaluationResult` object and an optional `ExportMeta` bag that carries run context and the failure analysis narrative.

```ts
type ExportMeta = {
  mode?: "hosted" | "self-hosted";
  fileName?: string;
  isSample?: boolean;
  outputSource?: "uploaded" | "generated";
  generatedRowCount?: number;
  provider?: string;
  model?: string;
  narrative?: NarrativeResponse; // populated after failure analysis
};
```

| Format | Function | Notes |
|--------|----------| ------|
| CSV | `exportToCsv(result, meta)` | Comment header block with mode, provider, model, narrative summary |
| JSON | `exportToJson(result, meta)` | `meta` block + optional `failureAnalysis` field |
| Markdown | `exportToMarkdown(result, meta)` | Run Context table, Highlights, Failure Breakdown, Failure Analysis sections |
| PDF | `exportToPdf(result, meta)` | Context panel, full failure detail snapshot (no truncation), narrative section |

CSV, JSON, and Markdown call `downloadFile(content, filename, mimeType)` which creates a temporary `<a>` element, clicks it, and cleans up. PDF calls `doc.save()` directly via jsPDF.

---

## The API Routes

There are two server-side endpoints, both under `/eval-lens/api/`.

### `GET /api/config`

Returns the deployment mode and available providers. Called once on page load.

```ts
// Hosted response
{ mode: "hosted", providers: [] }

// Self-hosted response (with OpenAI and Anthropic keys set)
{ mode: "self-hosted", providers: [
  { id: "openai", config: { name: "OpenAI", availableModels: [...], defaultModel: "..." } },
  { id: "anthropic", config: { ... } }
]}
```

### `POST /api/generate`

Accepts a list of rows and streams generated outputs as SSE. Only reachable in self-hosted mode — the route validates this before processing. See Step 3 above for the full flow.

### `POST /api/narrative`

Accepts a list of failed rows and a provider ID. Only reachable in self-hosted mode. Returns a `NarrativeResponse` containing a summary, failure patterns, and a recommendation.

```ts
// Request body
{ failedRows: NarrativeRow[], provider: "openai" | "anthropic" | "gemini" }

// Response
{ summary: string, patterns: NarrativePattern[], recommendation: string }
```

The route uses `createProviderFromEnv(provider, process.env)` to resolve the API key without duplicating key-map logic from the provider abstraction.

---

## How the Pieces Fit Together

```
Browser
│
├── useEvaluation (hook)
│   ├── on mount          → GET /api/config
│   ├── handleFileUpload  → parseFile → inferSchema
│   ├── confirmSchema     → decides: generate or evaluate?
│   ├── handleGenerate    → generateWithStream → POST /api/generate (SSE)
│   ├── (after generate)  → evaluateDataset → setState(result)
│   └── triggerNarrative  → POST /api/narrative → setState(narrative)
│
├── Components (read state, call hook handlers)
│   ├── UploadStep
│   ├── SchemaStep
│   ├── GeneratingStep
│   ├── EvaluatingStep
│   └── ResultsStep
│       ├── RowInspector
│       ├── ExportMenu
│       └── NarrativePanel  (self-hosted only)
│
└── src/lib/ (pure functions, no React)
    ├── parsers/   parseFile → parseCsv / parseJsonl
    ├── schema/    inferSchema, validateAgainstSchema
    ├── evaluator/ evaluateRow, evaluateDataset
    ├── export/    exportToCsv/Json/Markdown/Pdf, downloadFile
    ├── providers/ createProvider, createProviderFromEnv, getAvailableProviders
    └── narrative/ buildNarrativePrompt, parseNarrativeResponse
```

---

## Key Design Decisions

**`src/lib/` has zero React dependencies.** Every evaluation function is a plain TypeScript function that takes data and returns data. This makes them trivially testable and reusable outside the UI.

**Runtime mode gating, not build-time.** `EVALLENS_MODE` is read server-side only. The client learns the mode by calling `GET /api/config` on mount. This means a single Docker image can run in either mode based on the environment variable injected at runtime — no rebuild required.

**`actual` defaults to `""`** when the column is absent. This makes the "no actual yet" state representable without a separate field, and keeps the `RawDatasetRow` type simple. An empty string always fails JSON parsing, which triggers `UNPARSEABLE` — the correct failure for an ungenerated row.

**`actual` defaults to `""`** when the column is absent. This makes the "no actual yet" state representable without a separate field, and keeps the `RawDatasetRow` type simple. An empty string always fails JSON parsing, which triggers `UNPARSEABLE` — the correct failure for an ungenerated row.

**Structural failures block value comparison.** If a field has `WRONG_TYPE`, comparing its value would produce a misleading `WRONG_VALUE` on top of it. The evaluator tracks which fields already failed and skips them.

**SSE over WebSockets for generation.** Generation is a one-way stream from server to client, so SSE is the simplest fit. It works over plain HTTP, needs no special server setup, and the browser's `ReadableStream` API handles it natively.

**Non-fatal parse errors don't stop the pipeline.** A single malformed row in a 500-row file shouldn't block the whole evaluation. Errors are collected and surfaced as a collapsible warning, while valid rows continue through the pipeline.
