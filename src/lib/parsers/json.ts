import { RawDatasetRow, ParseError } from "../types";
import { parseJsonl, recordToRow } from "./jsonl";

/**
 * JSON parser implementation.
 *
 * Accepts a JSON array of row objects (the usual shape of a `.json` export)
 * or a single row object. Files that are really JSON Lines saved with a
 * `.json` extension fall back to the JSONL parser.
 */

type JsonParseResult = {
  rows: RawDatasetRow[];
  errors: ParseError[];
};

/**
 * Parses a `.json` file into dataset rows.
 *
 * - An array is treated as one row per element; invalid elements are skipped
 *   and added to `errors`, matching the JSONL parser's behaviour
 * - A single object is treated as a one-row dataset
 * - Content that isn't a single JSON document is parsed as JSON Lines
 *
 * @throws {Error} if the file is empty, or is a JSON document that is neither
 *   an array nor an object (e.g. a bare string)
 */
export function parseJson(content: string): JsonParseResult {
  if (content.trim() === "") {
    throw new Error("File is empty");
  }

  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    // Not one JSON document — most likely JSON Lines with a .json extension
    return parseJsonl(content);
  }

  const records = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null
      ? [data]
      : null;

  if (records === null) {
    throw new Error(
      "JSON file must contain an array of rows or a single row object",
    );
  }
  if (records.length === 0) {
    throw new Error("File is empty");
  }

  const rows: RawDatasetRow[] = [];
  const errors: ParseError[] = [];

  records.forEach((record, index) => {
    const result = recordToRow(record, index + 1, "Row");
    if ("error" in result) errors.push(result.error);
    else rows.push(result.row);
  });

  return { rows, errors };
}
