import {
  RawDatasetRow,
  InferredSchema,
  RowResult,
  Failure,
} from "../types";
import { validateAgainstSchema } from "../schema";
import { getValueType } from "../utils";

/**
 * Deep-equality check for two values.
 * Objects are compared recursively by key, ignoring insertion order.
 * Arrays are compared by JSON serialisation (order is significant for arrays).
 * Primitives are compared with strict equality.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  const typeA = getValueType(a);
  if (typeA === "array") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  if (typeA === "object") {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA).sort();
    const keysB = Object.keys(objB).sort();
    if (keysA.length !== keysB.length) return false;
    if (JSON.stringify(keysA) !== JSON.stringify(keysB)) return false;
    return keysA.every((k) => valuesEqual(objA[k], objB[k]));
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
