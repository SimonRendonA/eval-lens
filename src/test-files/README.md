# EvalLens Test Files

All prompts include explicit output format instructions (system role, key names, types, enums). All expected fields are deterministic — no confidence scores or subjective metrics that would produce false failures.

## Hosted Mode (with `actual` column)

### Happy Path
| File | Format | Rows | Domain |
|------|--------|------|--------|
| `hosted-all-pass.csv` | CSV | 5 | Job posting extraction (title, company, location, salary) |

### Mixed Results
| File | Format | Rows | Domain | Failure types |
|------|--------|------|--------|---------------|
| `hosted-mixed-results.csv` | CSV | 10 | Real estate listings (address, city, beds, baths, price, type) | WRONG_VALUE, WRONG_TYPE, MISSING_FIELD, EXTRA_FIELD, UNPARSEABLE |
| `hosted-product-reviews.jsonl` | JSONL | 8 | Product review parsing (name, brand, rating, verified) | WRONG_TYPE, MISSING_FIELD, EXTRA_FIELD, UNPARSEABLE |

### Specific Failures
| File | Format | Rows | Domain |
|------|--------|------|--------|
| `hosted-every-failure.csv` | CSV | 6 | Invoice parsing (vendor, date, total, currency) — one pass + one of each failure type |
| `hosted-edge-cases.jsonl` | JSONL | 5 | Employee profiles with nested address objects, skill arrays, nulls, booleans |

### Stress Test
| File | Format | Rows | Domain |
|------|--------|------|--------|
| `hosted-stress-1000.csv` | CSV | 1000 | Tech company extraction (company, industry, city, founded, employees, is_public) — ~54% pass rate |

---

## Self-Hosted Mode (without `actual` column)

### Generation Flow
| File | Format | Rows | Domain |
|------|--------|------|--------|
| `selfhosted-contracts.csv` | CSV | 5 | Legal contract clause extraction (parties, date, term, governing law) |
| `selfhosted-recipes.jsonl` | JSONL | 6 | Recipe extraction from descriptions (dish, cuisine, times, servings, vegetarian) |
| `selfhosted-partial-actuals.csv` | CSV | 6 | Tech conference extraction — 3 rows with actuals, 3 without (tests partial generation) |
| `selfhosted-stress-50.csv` | CSV | 50 | Product listing extraction — tests SSE progress at scale |

---

## Error Handling

| File | Tests |
|------|-------|
| `error-no-actual-hosted.csv` | No actual column in hosted mode — hook should show error |
| `error-missing-expected.csv` | No expected column — parser should throw |
| `error-missing-values.csv` | Some rows have empty cells — parse warnings |
| `error-malformed.jsonl` | Invalid JSON, arrays, missing keys — parse errors |
| `error-empty.csv` | Empty file — should throw |
| `error-wrong-type.txt` | Unsupported file type — parseFile should throw |

---

## Testing Guide

### Hosted mode
1. `EVALLENS_MODE=hosted` (or unset)
2. Upload any "Hosted Mode" file
3. Flow: upload → schema → evaluate → results

### Self-hosted mock
1. `EVALLENS_MODE=self-hosted`, `USE_MOCK_GENERATION=true`, set any API key (e.g. `sk-test`)
2. Upload any "Self-Hosted Mode" file
3. Flow: upload → schema → provider select → generate with progress → evaluate → results

### Self-hosted real
1. `EVALLENS_MODE=self-hosted`, `USE_MOCK_GENERATION=false`, set a real API key
2. Use `selfhosted-contracts.csv` (5 rows, minimal credit burn)
3. Same flow as mock but with real API responses
