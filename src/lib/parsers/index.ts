import { RawDatasetRow, ParseError } from "../types";
import { parseCsv } from "./csv";
import { parseJsonl } from "./jsonl";
import { parseJson } from "./json";

/**
 * Parser entrypoint that dispatches by file extension and normalizes supported
 * text formats into `RawDatasetRow[]` plus non-fatal parse warnings.
 */

type ParseResult = {
  rows: RawDatasetRow[];
  errors: ParseError[];
};

/**
 * Parses a file's text content into dataset rows by delegating to the
 * appropriate parser based on the file extension.
 *
 * Supported extensions: `.csv`, `.jsonl`, `.json`
 *
 * @throws {Error} if the extension is unsupported, or if the underlying parser
 *   encounters a fatal error (e.g. missing required columns in a CSV).
 */
export function parseFile(content: string, filename: string): ParseResult {
  const extension = filename.split(".").pop()?.toLowerCase();

  let result: ParseResult;
  switch (extension) {
    case "csv":
      result = parseCsv(content);
      break;
    case "jsonl":
      result = parseJsonl(content);
      break;
    case "json":
      result = parseJson(content);
      break;
    default:
      throw new Error(
        `Unsupported file type: .${extension}. Use .csv, .jsonl, or .json`,
      );
  }

  const { rows, warnings } = disambiguateIds(result.rows);
  return { rows, errors: [...result.errors, ...warnings] };
}

/**
 * Renames repeated ids (`7`, `7#2`, `7#3`, …) and reports each rename.
 *
 * Everything downstream — the row inspector, failure analysis, merging
 * generated outputs back into rows — looks rows up by id, so two rows sharing
 * an id would silently overwrite each other. Renaming keeps every row and
 * makes the collision visible instead of dropping data.
 */
export function disambiguateIds(rows: RawDatasetRow[]): {
  rows: RawDatasetRow[];
  warnings: ParseError[];
} {
  const taken = new Set(rows.map((row) => row.id));
  const seen = new Set<string>();
  const warnings: ParseError[] = [];

  const renamed = rows.map((row) => {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      return row;
    }

    let suffix = 2;
    while (taken.has(`${row.id}#${suffix}`)) suffix++;
    const id = `${row.id}#${suffix}`;
    taken.add(id);
    seen.add(id);
    warnings.push({
      row: id,
      message: `Duplicate id "${row.id}" renamed to "${id}"`,
    });
    return { ...row, id };
  });

  return { rows: renamed, warnings };
}

export { parseCsv } from "./csv";
export { parseJsonl } from "./jsonl";
export { parseJson } from "./json";
