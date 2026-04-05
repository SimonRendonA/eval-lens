import {
  RawDatasetRow,
  InferredSchema,
  RowResult,
  Failure,
  SchemaField,
} from "../types";
import { validateAgainstSchema } from "../schema";

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
 * Deep-equality check for two values.
 * Objects and arrays are compared via JSON serialisation;
 * primitives are compared with strict equality.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  const typeA = getType(a);
  if (typeA === "object" || typeA === "array") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

/**
 * Evaluates a single dataset row against a schema.
 *
 * Evaluation order:
 * 1. Parse `expected` — fail with `UNPARSEABLE` if invalid JSON
 * 2. Parse `actual` — fail with `UNPARSEABLE` if invalid JSON
 * 3. Run structural checks via `validateAgainstSchema`
 *    (`MISSING_FIELD`, `WRONG_TYPE`, `EXTRA_FIELD`)
 * 4. For fields that passed structural checks, compare values (`WRONG_VALUE`)
 *
 * Fields that fail structural checks are **not** checked for value equality.
 */
export function evaluateRow(
  row: RawDatasetRow,
  schema: InferredSchema,
): RowResult {
  // Parse expected
  let expected: Record<string, unknown>;
  try {
    expected = JSON.parse(row.expected);
  } catch {
    return {
      id: row.id,
      status: "fail",
      failures: [
        {
          reason: "UNPARSEABLE",
          field: "_root",
          expected: "Valid JSON",
          actual: row.expected,
        },
      ],
    };
  }

  // Parse actual
  let actual: Record<string, unknown>;
  try {
    actual = JSON.parse(row.actual);
  } catch {
    return {
      id: row.id,
      status: "fail",
      failures: [
        {
          reason: "UNPARSEABLE",
          field: "_root",
          expected: "Valid JSON",
          actual: row.actual,
        },
      ],
    };
  }

  // Structural checks via schema validation
  const schemaFailures = validateAgainstSchema(actual, schema);

  // Track which fields had structural failures so we skip value comparison
  const failedFields = new Set(schemaFailures.map((f) => f.field));

  // Value comparison for fields that passed structural checks
  const valueFailures: Failure[] = [];

  for (const field of schema.fields) {
    if (failedFields.has(field.name)) continue;
    if (!(field.name in expected)) continue;
    if (!(field.name in actual)) continue;

    if (!valuesEqual(expected[field.name], actual[field.name])) {
      valueFailures.push({
        reason: "WRONG_VALUE",
        field: field.name,
        expected: expected[field.name],
        actual: actual[field.name],
      });
    }
  }

  const failures = [...schemaFailures, ...valueFailures];

  return {
    id: row.id,
    status: failures.length === 0 ? "pass" : "fail",
    failures,
  };
}
