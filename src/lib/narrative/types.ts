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
  failureReasons: string[];
  fieldFailures?: Record<string, string>;
}

export interface NarrativeResponse {
  summary: string;
  patterns: NarrativePattern[];
  recommendation: string;
}

export interface NarrativePattern {
  title: string;
  description: string;
  affectedCount: number;
  exampleIds: string[];
}