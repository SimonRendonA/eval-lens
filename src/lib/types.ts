/** The category of a single evaluation failure. */
export type FailureReason =
  | "SCHEMA_MISMATCH"
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

/** A single field in an inferred schema. */
export type SchemaField = {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "null";
  /** True if the field appeared in every row of the dataset. */
  required: boolean;
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
  provider?: string;
  model?: string;
};
