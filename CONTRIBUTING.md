# Contributing to EvalLens

Thanks for your interest in contributing! This document covers everything you need to get started.

## Development Setup

```bash
git clone https://github.com/simonrendona/eval-lens.git
cd eval-lens
npm install
cp .env.example .env.local
npm run dev
```

The app runs at [http://localhost:3000/eval-lens](http://localhost:3000/eval-lens).

## Branch Naming Scheme 
Pattern: type/short-description
Types:

feat/ — new feature (feat/donut-chart, feat/sample-data)
fix/ — bug fix (fix/pdf-background, fix/trailing-slash-loop)
chore/ — maintenance, docs, config (chore/update-readme, chore/docker-setup)
refactor/ — restructuring without behavior change (refactor/split-results-step)

### Testing Self-Hosted Features

Set these in `.env.local`:

```
EVALLENS_MODE=self-hosted
USE_MOCK_GENERATION=true
OPENAI_API_KEY=sk-test
```

Mock mode simulates API calls so you can test the full generation flow without burning credits.

## Architecture Overview

EvalLens has a strict two-layer architecture:

- **`src/lib/`** — Pure TypeScript evaluation engine. No React imports. Handles parsing, schema inference, evaluation, export, and provider abstraction. Should be usable standalone.
- **`src/app/`** — Next.js UI layer. Driven by a single `useEvaluation` hook that acts as a state machine. Components are purpose-built for their specific screen.

**If it doesn't need React, it goes in `src/lib/`. If it's a UI component, it goes in `src/app/`.**

## Code Style

- TypeScript strict mode
- Tailwind CSS v4 for styling (tokens defined in `globals.css` via `@theme`)
- shadcn/ui for UI primitives
- DM Sans for body text, DM Mono for code and data
- Functional components with hooks

## Design Tokens

All colors are defined in `src/app/globals.css` using Tailwind v4's `@theme` block. Reference `DESIGN_GUIDE.md` for the full token system, component patterns, and screen specifications.

Key rules:

- Use `text-pass` / `text-fail` / `text-warning` for semantic colors — never use brand teal for pass/success
- Use `bg-surface` for cards, `bg-elevated` for nested elements, `bg-bg` for page background
- Use `border-border` for all borders

## Pull Request Guidelines

1. **One concern per PR.** Don't mix a bug fix with a feature addition.
2. **Describe the why.** Your PR description should explain the problem or motivation, not just list what changed.
3. **Keep components pragmatic.** Don't introduce reusable abstractions unless you have 3+ concrete use cases right now.
4. **Engine changes need tests.** Anything in `src/lib/` should have corresponding tests. UI changes don't need tests unless they involve complex logic.
5. **Match the visual language.** Reference `DESIGN_GUIDE.md` for design tokens and component patterns.

## Reporting Bugs

Use the [Bug Report](https://github.com/simonrendona/eval-lens/issues/new?template=bug_report.md) template. Include steps to reproduce, expected vs actual behavior, and a sample file if relevant (remove sensitive data first).

## Suggesting Features

Use the [Feature Request](https://github.com/simonrendona/eval-lens/issues/new?template=feature_request.md) template. Describe the problem you're solving, your proposed solution, and alternatives you've considered.


## Dataset Format

If you're working on parsers or evaluation logic, the canonical column contract is:

| Column | Type | Required | Purpose |
|--------|------|----------|---------|
| `id` | string | Yes | Unique row identifier |
| `prompt` | string | Yes | Input prompt sent to the model |
| `expected` | JSON string | Yes | Expected structured output |
| `actual` | JSON string | Hosted: Yes / Self-hosted: Optional | Model's actual output |

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
