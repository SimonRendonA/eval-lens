import { EvaluationResult, ExportMeta } from "../types";

/**
 * CSV exporter.
 *
 * Produces one row per evaluated item and flattens failure arrays into compact
 * semicolon-delimited cells suitable for spreadsheet tools.
 */


export function exportToCsv(
  result: EvaluationResult,
  meta?: ExportMeta,
): string {
  const lines: string[] = [];

  lines.push(`# EvalLens CSV Report`);
  lines.push(`# Mode: ${meta?.mode === "self-hosted" ? "self-hosted" : "hosted"}`);
  lines.push(`# Output source: ${formatOutputSource(meta)}`);
  if (meta?.fileName) lines.push(`# File: ${meta.fileName}`);
  if (meta?.isSample) lines.push(`# Dataset: sample`);
  if (meta?.mode === "self-hosted") {
    if (meta.provider) lines.push(`# Provider: ${meta.provider}`);
    if (meta.model) lines.push(`# Model: ${meta.model}`);
    lines.push(`# Generated rows: ${meta.generatedRowCount ?? 0}`);
  }
  if (meta?.narrative) {
    lines.push(`# Failure analysis summary: ${singleLine(meta.narrative.summary)}`);
    if (meta.narrative.patterns.length > 0) {
      lines.push(
        `# Failure patterns: ${meta.narrative.patterns
          .map((pattern) => `${pattern.title} (${pattern.affectedCount})`)
          .join(" | ")}`,
      );
    }
    lines.push(
      `# Recommended next step: ${singleLine(meta.narrative.recommendation)}`,
    );
  }
  lines.push("");

  lines.push("id,status,failure_reasons,failure_details");

  for (const row of result.rowResults) {
    const reasons = row.failures.map((f) => f.reason).join("; ");
    const details = row.failures
      .map(
        (f) =>
          `${f.field}: expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.actual)}`,
      )
      .join("; ");

    lines.push(
      [
        csvEscape(row.id),
        row.status,
        csvEscape(reasons),
        csvEscape(details),
      ].join(","),
    );
  }

  return lines.join("\n");
}

function formatOutputSource(meta?: ExportMeta): string {
  if (meta?.mode === "self-hosted" && meta.outputSource === "generated") {
    return `provider-generated${meta.generatedRowCount ? ` (${meta.generatedRowCount})` : ""}`;
  }

  return "uploaded";
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
