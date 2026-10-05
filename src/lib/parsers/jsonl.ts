import { RawDatasetRow, ParseError } from "../types";

/**
 * JSONL/JSON parser implementation.
 *
 * Processes one JSON object per line, validates required keys, and normalizes
 * non-string expected/actual payloads via JSON stringification.
 */

const REQUIRED_KEYS = ["id", "prompt", "expected"] as const;

type JsonlParseResult = {
  rows: RawDatasetRow[];
  errors: ParseError[];
};

/**
 * Parses a JSONL string (one JSON object per line) into dataset rows.
 *
 * - Required keys: `id`, `prompt`, `expected`
 * - Optional key: `actual` (defaults to `""` when absent)
 * - Non-string `expected`/`actual` values are JSON-stringified automatically
 * - Lines with parse errors or missing keys are skipped and added to `errors`
 *
 * @throws {Error} if the file is empty or contains only blank lines
 */
export function parseJsonl(content: string): JsonlParseResult {
  const lines = content.split("\n").filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    throw new Error("File is empty");
  }

  const rows: RawDatasetRow[] = [];
  const errors: ParseError[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      errors.push({
        row: lineNumber,
        message: "Invalid JSON",
      });
      return;
    }

    const result = recordToRow(parsed, lineNumber, "Line");
    if ("error" in result) errors.push(result.error);
    else rows.push(result.row);
  });

  return { rows, errors };
}

/**
 * Validates one parsed JSON record and normalizes it into a dataset row.
 * Shared by the JSONL parser (one record per line) and the JSON parser (an
 * array of records).
 *
 * @param position 1-indexed line or array position, used in error messages
 * @param unit What a record is called in messages ("Line" or "Row")
 */
export function recordToRow(
  record: unknown,
  position: number,
  unit: "Line" | "Row",
): { row: RawDatasetRow } | { error: ParseError } {
  if (typeof record !== "object" || record === null || Array.isArray(record)) {
    return {
      error: { row: position, message: `${unit} must be a JSON object` },
    };
  }

  const parsed = record as Record<string, unknown>;
  const missing = REQUIRED_KEYS.filter((key) => !(key in parsed));

  if (missing.length > 0) {
    return {
      error: {
        row: parsed.id !== undefined ? String(parsed.id) : position,
        message: `Missing keys: ${missing.join(", ")}`,
      },
    };
  }

  // A missing actual becomes "" so self-hosted mode knows to generate it
  const actual = "actual" in parsed ? parsed.actual : "";

  return {
    row: {
      id: String(parsed.id),
      prompt: String(parsed.prompt),
      expected:
        typeof parsed.expected === "string"
          ? parsed.expected
          : JSON.stringify(parsed.expected),
      actual: typeof actual === "string" ? actual : JSON.stringify(actual),
    },
  };
}
