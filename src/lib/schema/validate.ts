import { InferredSchema, SchemaField, Failure } from "../types";

/**
 * Schema validation module.
 *
 * Compares parsed `actual` objects against an inferred schema and emits
 * structural failures (`MISSING_FIELD`, `WRONG_TYPE`, `EXTRA_FIELD`).
 */

/** Maps a runtime value to its SchemaField type tag. */
function getType(value: unknown): SchemaField["type"] {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === "object")
    return t;
  return "string";
}

/**
 * Validates a parsed `actual` object against an inferred schema.
 *
 * Checks performed:
 * - `MISSING_FIELD` — a required schema field is absent from `actual`
 * - `WRONG_TYPE` — a field is present but its type does not match the schema
 * - `EXTRA_FIELD` — `actual` contains a key not defined in the schema
 *
 * Optional fields that are absent do not generate failures.
 *
 * @returns An array of failures. Empty array means the object conforms to the schema.
 */
export function validateAgainstSchema(
  actual: Record<string, unknown>,
  schema: InferredSchema,
): Failure[] {
  const failures: Failure[] = [];
  const schemaKeys = new Set(schema.fields.map((f) => f.name));

  // Check each field in the schema
  for (const field of schema.fields) {
    const exists = field.name in actual;

    if (!exists) {
      if (field.required) {
        failures.push({
          reason: "MISSING_FIELD",
          field: field.name,
          expected: field.type,
          actual: undefined,
        });
      }
      continue;
    }

    const actualType = getType(actual[field.name]);

    if (actualType !== field.type) {
      failures.push({
        reason: "WRONG_TYPE",
        field: field.name,
        expected: field.type,
        actual: actualType,
      });
    }
  }

  // Check for extra fields not in the schema
  for (const key of Object.keys(actual)) {
    if (!schemaKeys.has(key)) {
      failures.push({
        reason: "EXTRA_FIELD",
        field: key,
        expected: undefined,
        actual: actual[key],
      });
    }
  }

  return failures;
}
