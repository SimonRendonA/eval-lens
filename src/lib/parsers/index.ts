import { RawDatasetRow } from "../types";
import { parseCsv } from "./csv";
import { parseJsonl } from "./jsonl";

type ParseError = {
  row: number | string;
  message: string;
};

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

  switch (extension) {
    case "csv":
      return parseCsv(content);
    case "jsonl":
    case "json":
      return parseJsonl(content);
    default:
      throw new Error(
        `Unsupported file type: .${extension}. Use .csv, .jsonl, or .json`,
      );
  }
}

export { parseCsv } from "./csv";
export { parseJsonl } from "./jsonl";
