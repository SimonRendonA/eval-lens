import Papa from "papaparse";
import { RawDatasetRow } from "../types";

/**
 * CSV parser implementation.
 *
 * Enforces required columns, trims row values, and records row-level parse
 * issues without aborting the entire dataset unless headers are invalid.
 */

const REQUIRED_COLUMNS = ["id", "prompt", "expected"] as const;

type ParseError = {
  row: number | string;
  message: string;
};

type CsvParseResult = {
  rows: RawDatasetRow[];
  errors: ParseError[];
};

/**
 * Parses a CSV string into dataset rows.
 *
 * - Required columns: `id`, `prompt`, `expected`
 * - Optional column: `actual` (defaults to `""` when absent or empty)
 * - Rows with missing required values are skipped and added to `errors`
 *
 * @throws {Error} if any required column header is missing from the file
 */
export function parseCsv(content: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !headers.includes(col),
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(", ")}. Found: ${headers.join(", ")}`,
    );
  }

  const rows: RawDatasetRow[] = [];
  const errors: ParseError[] = [];

  parsed.data.forEach((record, index) => {
    const rowNumber = index + 2; // +2 for 1-indexed + header row
    const rowId = record.id?.trim() || `row ${rowNumber}`;

    const missing = REQUIRED_COLUMNS.filter(
      (col) => !record[col] || record[col].trim() === "",
    );

    if (missing.length > 0) {
      errors.push({
        row: rowId,
        message: `Missing values for: ${missing.join(", ")}`,
      });
      return;
    }

    rows.push({
      id: record.id.trim(),
      prompt: record.prompt.trim(),
      expected: record.expected.trim(),
      actual: record.actual?.trim() || "",
    });
  });

  if (parsed.errors.length > 0) {
    parsed.errors.forEach((err) => {
      errors.push({
        row: err.row !== undefined ? err.row + 2 : "unknown",
        message: err.message,
      });
    });
  }

  return { rows, errors };
}
