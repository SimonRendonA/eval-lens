import {
  RawDatasetRow,
  InferredSchema,
  RowResult,
  Failure,
} from "../types";
import { validateAgainstSchema } from "../schema";
import { getValueType, hasOwn, isPlainObject } from "../utils";
import { parseOutput } from "./parse-output";

/**
 * Deep-equality check for two JSON values.
 * Objects are compared recursively by key, ignoring insertion order — also
 * when they sit inside arrays. Arrays are compared element by element (order
 * is significant). Primitives are compared with strict equality.
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  const typeA = getValueType(a);
  if (typeA !== getValueType(b)) return false;

  if (typeA === "array") {
    const arrA = a as unknown[];
    const arrB = b as unknown[];
    return (
      arrA.length === arrB.length &&
      arrA.every((item, i) => valuesEqual(item, arrB[i]))
    );
  }
  if (typeA === "object") {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA).sort();
    const keysB = Object.keys(objB).sort();
    if (keysA.length !== keysB.length) return false;
    if (keysA.some((key, i) => key !== keysB[i])) return false;
    return keysA.every((k) => valuesEqual(objA[k], objB[k]));
  }
  return a === b;
}

/**
 * Evaluates a single dataset row against a schema.
 *
 * Evaluation order:
 * 1. Parse `expected` — fail with `UNPARSEABLE` if it is not a JSON object
 * 2. Parse `actual` — fail with `UNPARSEABLE` if no JSON can be recovered.
 *    JSON recovered from a markdown fence or prose adds `WRAPPED_JSON`, and
 *    evaluation continues on the recovered content
 * 3. Run structural checks via `validateAgainstSchema`
 *    (`WRONG_TYPE` on `_root` for non-object output, `MISSING_FIELD`,
 *    `WRONG_TYPE`, `EXTRA_FIELD`)
 * 4. For fields that passed structural checks, compare values (`WRONG_VALUE`)
 *
 * Fields that fail structural checks are **not** checked for value equality.
 */
export function evaluateRow(
  row: RawDatasetRow,
  schema: InferredSchema,
): RowResult {
  // Parse expected — the answer key must be a JSON object
  let expected: unknown;
  try {
    expected = JSON.parse(row.expected);
  } catch {
    expected = undefined;
  }
  if (!isPlainObject(expected)) {
    return {
      id: row.id,
      status: "fail",
      failures: [
        {
          reason: "UNPARSEABLE",
          field: "_root",
          expected: "Valid JSON object",
          actual: row.expected,
        },
      ],
    };
  }

  // Parse actual, recovering JSON wrapped in a markdown fence or prose
  const output = parseOutput(row.actual);
  if (!output.ok) {
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

  const failures: Failure[] = [];
  if (output.wrapper !== null) {
    failures.push({
      reason: "WRAPPED_JSON",
      field: "_root",
      expected: "Bare JSON",
      actual: row.actual,
    });
  }

  // Structural checks via schema validation. Valid JSON that is not an
  // object (null, a number, an array…) fails here on `_root`.
  const schemaFailures = validateAgainstSchema(output.value, schema, expected);
  failures.push(...schemaFailures);
  if (!isPlainObject(output.value)) {
    return { id: row.id, status: "fail", failures };
  }
  const actual = output.value;

  // Track which fields had structural failures so we skip value comparison
  const failedFields = new Set(schemaFailures.map((f) => f.field));

  // Value comparison for fields that passed structural checks
  for (const field of schema.fields) {
    if (failedFields.has(field.name)) continue;
    if (!hasOwn(expected, field.name)) continue;
    if (!hasOwn(actual, field.name)) continue;

    if (!valuesEqual(expected[field.name], actual[field.name])) {
      failures.push({
        reason: "WRONG_VALUE",
        field: field.name,
        expected: expected[field.name],
        actual: actual[field.name],
      });
    }
  }

  return {
    id: row.id,
    status: failures.length === 0 ? "pass" : "fail",
    failures,
  };
}
