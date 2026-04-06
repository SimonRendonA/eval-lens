import { EvaluationResult, ExportMeta } from "../types";

/**
 * JSON exporter.
 *
 * Emits a pretty-printed, lossless representation of summary + row results,
 * with optional generation metadata block when provider/model is known.
 */

export function exportToJson(
  result: EvaluationResult,
  meta?: ExportMeta,
): string {
  const output: Record<string, unknown> = {};

  if (meta?.provider || meta?.model) {
    output.meta = {
      generated: new Date().toISOString(),
      ...(meta.provider && { provider: meta.provider }),
      ...(meta.model && { model: meta.model }),
    };
  }

  output.summary = result.summary;
  output.rowResults = result.rowResults;

  return JSON.stringify(output, null, 2);
}
