import type { AvailableProvider } from "@/lib/providers";

export type NarrativeStatus = "idle" | "loading" | "success" | "error";

export interface NarrativeRequest {
  failedRows: NarrativeRow[];
  totalRows: number;
  failedCount: number;
  passedCount: number;
  failureBreakdown: Record<string, number>;
  provider: AvailableProvider["id"];
}

export interface NarrativeRow {
  id: string;
  prompt?: string;
  expected: string;
  actual: string;
  /** Every failure on the row. Clusters are built from these. */
  failures: { field: string; reason: string }[];
}

/**
 * All failed rows that share one (field, reason) pair, e.g. every row where
 * `company` is WRONG_VALUE. Built deterministically from the full failed-row
 * set, so its counts are exact rather than estimated from a sample.
 */
export interface FailureCluster {
  /** Stable id used in the prompt and in the model's answer, e.g. "C1". */
  id: string;
  field: string;
  reason: string;
  rowIds: string[];
}

export interface NarrativeResponse {
  summary: string;
  patterns: NarrativePattern[];
  recommendation: string;
  /** Patterns the model returned that cited no known cluster and were dropped. */
  discardedPatterns?: number;
}

export interface NarrativePattern {
  title: string;
  description: string;
  /** Rows in the union of the pattern's clusters, counted by EvalLens. */
  affectedCount: number;
  exampleIds: string[];
  /** The clusters the pattern explains, with exact row counts. */
  basis?: { field: string; reason: string; count: number }[];
}