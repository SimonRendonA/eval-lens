import type { NarrativeResponse } from "@/lib/narrative";

/** The category of a single evaluation failure. */
export type FailureReason =
  | "MISSING_FIELD"
  | "WRONG_TYPE"
  | "WRONG_VALUE"
  | "EXTRA_FIELD"
  | "UNPARSEABLE";

/** Details about a single field-level failure within a row. */
export type Failure = {
  reason: FailureReason;
  /** The field name, or `"_root"` for UNPARSEABLE failures. */
  field: string;
  expected: unknown;
  actual: unknown;
};

/** Evaluation outcome for a single dataset row. */
export type RowResult = {
  id: string;
  status: "pass" | "fail";
  /** Empty array when status is "pass". */
  failures: Failure[];
};

/** Aggregated statistics across all evaluated rows. */
export type Summary = {
  total: number;
  passed: number;
  failed: number;
  /** Fraction of rows that passed, in the range [0, 1]. */
  passRate: number;
  /** Count of each failure reason across all rows. */
  failureReasons: Record<FailureReason, number>;
};

/** Full evaluation output: per-row results plus aggregate summary. */
export type EvaluationResult = {
  summary: Summary;
  rowResults: RowResult[];
};

/** A dataset row after JSON-parsing the expected and actual columns. */
export type DatasetRow = {
  id: string;
  prompt: string;
  expected: Record<string, unknown>;
  actual: Record<string, unknown>;
};

/**
 * A dataset row as read from a file — expected and actual are raw JSON strings.
 * `actual` is `""` when the column is absent (self-hosted generation mode).
 */
export type RawDatasetRow = {
  expected: string;
  actual: string;
  prompt: string;
  id: string;
};

/** Runtime JSON value categories used for schema typing. */
export type ValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null";

/** A single field in an inferred schema. */
export type SchemaField = {
  name: string;
  /**
   * The most common non-null type seen in the `expected` column.
   * `"null"` only when every expected value for the field is null.
   */
  type: ValueType;
  /** True if the field appeared in every row of the dataset. */
  required: boolean;
  /** True if any expected value for the field is null; null actuals are then type-valid. */
  nullable?: boolean;
  /**
   * Every non-null type seen in the `expected` column, present only when there
   * is more than one (a type conflict in the answer key). Any of them is accepted.
   */
  mixedTypes?: ValueType[];
};

/** Schema inferred from the `expected` column of a dataset. */
export type InferredSchema = {
  fields: SchemaField[];
};

/** App-level configuration returned by the `/api/config` endpoint. */
export type EvalLensConfig = {
  mode: "hosted" | "self-hosted";
  providers?: string[];
};

/** A non-fatal parse error attached to a specific row. */
export type ParseError = {
  /** Row number (1-indexed) or the row's id string. */
  row: number | string;
  message: string;
};

export type ExportMeta = {
  mode?: "hosted" | "self-hosted";
  fileName?: string;
  isSample?: boolean;
  outputSource?: "uploaded" | "generated";
  generatedRowCount?: number;
  provider?: string;
  model?: string;
  narrative?: NarrativeResponse;
};
