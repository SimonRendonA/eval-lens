import { RawDatasetRow, InferredSchema, SchemaField } from "../types";

/**
 * Schema inference module.
 *
 * Builds an inferred field contract from `expected` JSON objects across all
 * rows (field names, primitive/object types, and requiredness).
 */

/** Maps a runtime value to its SchemaField type tag. */
function detectType(value: unknown): SchemaField["type"] {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === "object")
    return t;
  return "string";
}

/**
 * Infers a schema by scanning the `expected` field of every row.
 *
 * - Collects all unique keys across all rows
 * - Type is determined from the first row that contains the key
 * - A field is **required** if it appears in every row; otherwise optional
 *
 * @throws {Error} if `rows` is empty
 * @throws {Error} if any row's `expected` field is not a valid JSON object
 */
export function inferSchema(rows: RawDatasetRow[]): InferredSchema {
  if (rows.length === 0) {
    throw new Error("Cannot infer schema from empty dataset");
  }

  const parsedRows: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const parsed = JSON.parse(rows[i].expected);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error(
          `Row ${rows[i].id}: expected value must be a JSON object`,
        );
      }
      parsedRows.push(parsed);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(
          `Row ${rows[i].id}: failed to parse expected value as JSON`,
        );
      }
      throw e;
    }
  }

  // Collect all unique keys across every row
  const allKeys = new Set<string>();
  for (const row of parsedRows) {
    for (const key of Object.keys(row)) {
      allKeys.add(key);
    }
  }

  const fields: SchemaField[] = [];

  for (const key of allKeys) {
    // Determine type from the first row that has this key
    const firstRow = parsedRows.find((row) => key in row);
    const type = firstRow ? detectType(firstRow[key]) : "string";

    // A field is required if it appears in every row
    const appearances = parsedRows.filter((row) => key in row).length;
    const required = appearances === parsedRows.length;

    fields.push({ name: key, type, required });
  }

  return { fields };
}
