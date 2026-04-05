import { RawDatasetRow } from "../types";

const REQUIRED_KEYS = ["id", "prompt", "expected"] as const;

const OPTIONAL_KEYS = ["actual"] as const;

type ParseError = {
  row: number | string;
  message: string;
};

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

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      errors.push({
        row: lineNumber,
        message: "Invalid JSON",
      });
      return;
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      errors.push({
        row: lineNumber,
        message: "Line must be a JSON object",
      });
      return;
    }

    const missing = REQUIRED_KEYS.filter((key) => !(key in parsed));

    if (missing.length > 0) {
      errors.push({
        row: parsed.id !== undefined ? String(parsed.id) : lineNumber,
        message: `Missing keys: ${missing.join(", ")}`,
      });
      return;
    }
    // If no actual key, set it to empty string for easier handling downstream
    if (!("actual" in parsed)) {
      parsed.actual = "";
    }
    rows.push({
      id: String(parsed.id),
      prompt: String(parsed.prompt),
      expected:
        typeof parsed.expected === "string"
          ? parsed.expected
          : JSON.stringify(parsed.expected),
      actual:
        typeof parsed.actual === "string"
          ? parsed.actual
          : JSON.stringify(parsed.actual),
    });
  });

  return { rows, errors };
}
