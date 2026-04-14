import {
  RawDatasetRow,
  InferredSchema,
  EvaluationResult,
  FailureReason,
} from "../types";
import { evaluateRow } from "./evaluate-row";

/**
 * Dataset-level evaluator.
 *
 * Runs `evaluateRow` for each row and aggregates summary metrics and
 * per-reason failure counters for reporting and filtering in the UI.
 */

const ALL_FAILURE_REASONS: FailureReason[] = [
  "MISSING_FIELD",
  "WRONG_TYPE",
  "WRONG_VALUE",
  "EXTRA_FIELD",
  "UNPARSEABLE",
];

/**
 * Evaluates every row in the dataset and aggregates summary statistics.
 *
 * Each row is evaluated independently via `evaluateRow`. The summary includes:
 * - Total, passed, and failed counts
 * - Pass rate as a fraction in [0, 1] (0 for an empty dataset)
 * - Per-reason failure counts initialised to 0 for all known reasons
 */
export function evaluateDataset(
  rows: RawDatasetRow[],
  schema: InferredSchema,
): EvaluationResult {
  const rowResults = rows.map((row) => evaluateRow(row, schema));

  const passed = rowResults.filter((r) => r.status === "pass").length;
  const failed = rowResults.filter((r) => r.status === "fail").length;
  const total = rowResults.length;

  const failureReasons = Object.fromEntries(
    ALL_FAILURE_REASONS.map((reason) => [reason, 0]),
  ) as Record<FailureReason, number>;

  for (const result of rowResults) {
    for (const failure of result.failures) {
      failureReasons[failure.reason]++;
    }
  }

  return {
    summary: {
      total,
      passed,
      failed,
      passRate: total > 0 ? passed / total : 0,
      failureReasons,
    },
    rowResults,
  };
}
