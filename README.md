<p align="center">
  <img src="public/logo/lockup/lockup-dark.svg" alt="EvalLens" width="280" />
</p>

<p align="center">
  <strong>Evaluate structured LLM outputs with precision.</strong><br/>
  Compare model outputs against expected schemas and values — row by row.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#how-it-works">How It Works</a> ·
  <a href="#dataset-format">Dataset Format</a> ·
  <a href="#self-hosted-mode">Self-Hosted Mode</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

## What is EvalLens?

EvalLens is an evaluation tool for structured LLM outputs. Upload a dataset with expected and actual outputs, and EvalLens tells you exactly what passed, what failed, and why — with a clear failure taxonomy that goes beyond binary pass/fail.

**Use it for:**

- Prompt regression testing
- Extraction pipeline validation
- Classification output benchmarking
- Schema conformance checks
- Debugging why a model's structured output is wrong

## Two Modes

| | Hosted | Self-Hosted |
|---|---|---|
| **What it does** | Upload CSV/JSONL with `expected` + `actual` columns → evaluate | Same as hosted, plus generate `actual` outputs via AI providers before evaluating |
| **AI calls** | None — pure file comparison | OpenAI, Anthropic, Gemini (via env vars) |
| **Setup** | Visit [rendonarango.com/eval-lens](https://rendonarango.com/eval-lens) | Clone repo, add API keys, run locally or via Docker |

## Quick Start

### Hosted (no setup)

1. Go to [rendonarango.com/eval-lens](https://rendonarango.com/eval-lens)
2. Upload a CSV or JSONL file with `id`, `prompt`, `expected`, and `actual` columns
3. Review your evaluation results

### Local Development

```bash
git clone https://github.com/simonrendona/eval-lens.git
cd eval-lens
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000/eval-lens](http://localhost:3000/eval-lens).

### Self-Hosted (Docker)

```bash
docker build -t evallens .
docker run -p 3000:3000 \
  -e EVALLENS_MODE=self-hosted \
  -e OPENAI_API_KEY=sk-... \
  evallens
```

Or with Docker Compose:

```bash
# Add your API keys to a .env file first
docker compose up
```

Only set the API keys for providers you want to use. At least one is required for self-hosted mode.

## How It Works

1. **Upload** — Drag and drop a CSV or JSONL file
2. **Validate** — EvalLens confirms your columns and infers the schema from your `expected` column
3. **Generate** *(self-hosted only)* — If `actual` values are missing, select a provider and model to generate them
4. **Evaluate** — Each row is checked for schema conformance and value correctness
5. **Inspect** — Browse results with filters, click any row to see exactly why it passed or failed
6. **Export** — Download results as CSV, JSON, Markdown, or a branded PDF report

## Dataset Format

Your file must include these columns (CSV) or keys (JSONL):

| Column | Required | Description |
|--------|----------|-------------|
| `id` | Yes | Unique identifier for the row |
| `prompt` | Yes | The input prompt sent to the model |
| `expected` | Yes | The expected structured output (JSON string) |
| `actual` | Hosted: Yes / Self-hosted: Optional | The model's actual structured output (JSON string) |

### CSV Example

```csv
id,prompt,expected,actual
1,"Extract the name and role","{""name"": ""Alice"", ""role"": ""engineer""}","{""name"": ""Alice"", ""role"": ""engineer""}"
2,"Extract the name and role","{""name"": ""Bob"", ""role"": ""designer""}","{""name"": ""Bob"", ""role"": ""developer""}"
```

### JSONL Example

```jsonl
{"id": "1", "prompt": "Extract the vendor and total", "expected": {"vendor": "Acme", "total": 1250}, "actual": {"vendor": "Acme", "total": 1250}}
{"id": "2", "prompt": "Extract the vendor and total", "expected": {"vendor": "TechParts", "total": 3400}, "actual": {"vendor": "TechParts", "total": "3400"}}
```

### Prompt Guidelines

For best results, structure your prompts with:

- A system role ("You are a structured data extractor")
- Explicit output format ("Return valid JSON with keys: name, role, company")
- Type constraints ("age as integer", "is_active as boolean")
- Enum values when applicable ("type: one of house, condo, apartment")

Avoid fields with non-deterministic values (like confidence scores) — these will always produce false failures.

## Failure Taxonomy

EvalLens doesn't just say "fail." It tells you *why*:

| Failure Reason | Description |
|----------------|-------------|
| `SCHEMA_MISMATCH` | Output structure doesn't match expected schema |
| `MISSING_FIELD` | A required field is absent |
| `WRONG_TYPE` | Field exists but has the wrong data type |
| `WRONG_VALUE` | Field exists with correct type but wrong value |
| `EXTRA_FIELD` | Unexpected field present |
| `UNPARSEABLE` | Output couldn't be parsed as valid JSON |

## Export Formats

Export your evaluation results in four formats:

- **CSV** — Raw results for spreadsheet analysis
- **JSON** — Structured data for programmatic use
- **Markdown** — Human-readable report (the primary persistence format)
- **PDF** — Branded dark-mode report for sharing

Self-hosted exports include the provider and model used for generation.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Fonts:** DM Sans + DM Mono
- **Architecture:** Pure TypeScript evaluation engine (`src/lib/`) decoupled from React UI (`src/app/`)

## Project Structure

```
src/
├── lib/                    # Pure TypeScript engine (no React)
│   ├── types.ts            # Domain types and contracts
│   ├── parsers/            # CSV and JSONL parsers
│   ├── schema/             # Schema inference and validation
│   ├── evaluator/          # Row evaluation and failure classification
│   ├── export/             # Report generators (CSV, JSON, MD, PDF)
│   └── providers/          # AI provider abstraction (self-hosted)
└── app/                    # Next.js UI layer
    ├── layout.tsx
    ├── page.tsx
    ├── hooks/
    │   └── useEvaluation.ts
    ├── components/         # Step components
    └── api/                # API routes (config, generate)
```

The `src/lib` engine has zero React dependencies. It can be used standalone, in a CLI, or with a different framework.

## Self-Hosted Mode

Self-hosted mode adds AI provider integration so you can generate `actual` outputs before evaluating them.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `EVALLENS_MODE` | Set to `self-hosted` to enable provider features |
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `USE_MOCK_GENERATION` | Set to `true` for testing without API credits |

### Supported Providers and Models

| Provider | Models |
|----------|--------|
| OpenAI | gpt-5.4, gpt-5.4-mini, gpt-5.4-nano, gpt-4o, gpt-4.1-mini |
| Anthropic | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001 |
| Gemini | gemini-3.1-pro-preview, gemini-3-flash-preview, gemini-2.5-flash, gemini-2.5-flash-lite |

### Self-Hosted Flow

1. Upload a file (with or without `actual` column)
2. Confirm the inferred schema
3. If `actual` is missing, select a provider and model
4. Watch real-time progress as outputs are generated via SSE
5. Review evaluation results

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

MIT — see [LICENSE](LICENSE) for details.
