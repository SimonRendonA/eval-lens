import type {
  RawDatasetRow,
  InferredSchema,
  SchemaField,
  ValueType,
} from "../types";
import { getValueType, hasOwn } from "../utils";

/**
 * Schema inference module.
 *
 * Builds an inferred field contract from `expected` JSON objects across all
 * rows (field names, primitive/object types, and requiredness).
 */

/**
 * Infers a schema by scanning the `expected` field of every row.
 *
 * - Collects all unique keys across all rows
 * - Type is the most common non-null type for the key (ties: first seen)
 * - A field is **nullable** if any expected value for it is null
 * - A field records `mixedTypes` when the answer key uses more than one
 *   non-null type for it (e.g. `"3"` in one row, `3` in another)
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

  // Collect all unique keys across every row, in first-seen order
  const allKeys = new Set<string>();
  for (const row of parsedRows) {
    for (const key of Object.keys(row)) {
      allKeys.add(key);
    }
  }

  const fields: SchemaField[] = [];

  for (const key of allKeys) {
    // Count every type the key takes across the answer key. Using only the
    // first row's type would make a field whose first gold value is null
    // reject every later non-null value as WRONG_TYPE.
    const typeCounts = new Map<ValueType, number>();
    let appearances = 0;
    for (const row of parsedRows) {
      if (!hasOwn(row, key)) continue;
      appearances++;
      const type = getValueType(row[key]);
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    }

    const nullable = typeCounts.has("null");
    // Map iteration order is insertion order, so ties go to the first-seen type
    const nonNullTypes = [...typeCounts.entries()].filter(
      ([type]) => type !== "null",
    );
    const dominant = nonNullTypes.reduce<[ValueType, number] | null>(
      (best, entry) => (best === null || entry[1] > best[1] ? entry : best),
      null,
    );

    const field: SchemaField = {
      name: key,
      type: dominant ? dominant[0] : "null",
      // A field is required if it appears in every row
      required: appearances === parsedRows.length,
    };
    if (nullable) field.nullable = true;
    if (nonNullTypes.length > 1) {
      field.mixedTypes = nonNullTypes.map(([type]) => type);
    }

    fields.push(field);
  }

  return { fields };
}

/** Types an `actual` value may take for a field without being WRONG_TYPE. */
export function acceptedTypes(field: SchemaField): ValueType[] {
  const types = field.mixedTypes ?? [field.type];
  return field.nullable && !types.includes("null") ? [...types, "null"] : types;
}
