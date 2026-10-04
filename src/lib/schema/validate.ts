import { InferredSchema, Failure } from "../types";
import { getValueType, hasOwn, isPlainObject } from "../utils";
import { acceptedTypes } from "./infer";

/**
 * Schema validation module.
 *
 * Compares parsed `actual` objects against an inferred schema and emits
 * structural failures (`MISSING_FIELD`, `WRONG_TYPE`, `EXTRA_FIELD`).
 */

/**
 * Validates a parsed `actual` value against an inferred schema.
 *
 * Checks performed:
 * - `WRONG_TYPE` on `_root` — `actual` is not a JSON object (null, array,
 *   string, number, boolean). No field checks run in that case.
 * - `MISSING_FIELD` — a field is absent from `actual` although the schema
 *   requires it, or this row's `expected` object contains it
 * - `WRONG_TYPE` — a field is present but its type is not one the schema
 *   accepts (nullable fields accept `null`; mixed-type fields accept any
 *   type the answer key uses)
 * - `EXTRA_FIELD` — `actual` contains a key not defined in the schema
 *
 * Optional fields that are absent do not generate failures unless this row's
 * gold has a value for them.
 *
 * @param expected This row's parsed expected object. A field the row's gold
 *   contains is required for this row even if the schema marks it optional —
 *   otherwise an omitted optional value would pass silently.
 * @returns An array of failures. Empty array means the object conforms to the schema.
 */
export function validateAgainstSchema(
  actual: unknown,
  schema: InferredSchema,
  expected?: Record<string, unknown>,
): Failure[] {
  if (!isPlainObject(actual)) {
    return [
      {
        reason: "WRONG_TYPE",
        field: "_root",
        expected: "object",
        actual: getValueType(actual),
      },
    ];
  }

  const failures: Failure[] = [];
  const schemaKeys = new Set(schema.fields.map((f) => f.name));

  // Check each field in the schema
  for (const field of schema.fields) {
    if (!hasOwn(actual, field.name)) {
      const requiredForRow =
        field.required || (expected !== undefined && hasOwn(expected, field.name));
      if (requiredForRow) {
        failures.push({
          reason: "MISSING_FIELD",
          field: field.name,
          expected: field.type,
          actual: undefined,
        });
      }
      continue;
    }

    const actualType = getValueType(actual[field.name]);

    if (!acceptedTypes(field).includes(actualType)) {
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
