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
  const output: Record<string, unknown> = {
    meta: buildMeta(meta),
    summary: result.summary,
    rowResults: result.rowResults,
  };

  if (meta?.narrative) {
    output.failureAnalysis = meta.narrative;
  }

  return JSON.stringify(output, null, 2);
}

function buildMeta(meta?: ExportMeta): Record<string, unknown> {
  return {
    generated: new Date().toISOString(),
    mode: meta?.mode ?? "hosted",
    outputSource:
      meta?.mode === "self-hosted" && meta.outputSource === "generated"
        ? "provider-generated"
        : "uploaded",
    ...(meta?.fileName && { fileName: meta.fileName }),
    ...(meta?.isSample && { isSample: true }),
    ...(meta?.mode === "self-hosted" && meta.provider
      ? { provider: meta.provider }
      : {}),
    ...(meta?.mode === "self-hosted" && meta.model
      ? { model: meta.model }
      : {}),
    ...(meta?.mode === "self-hosted"
      ? { generatedRowCount: meta.generatedRowCount ?? 0 }
      : {}),
  };
}
