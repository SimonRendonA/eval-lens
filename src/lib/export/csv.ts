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

  if (meta?.provider || meta?.model) {
    if (meta.provider) lines.push(`# Provider: ${meta.provider}`);
    if (meta.model) lines.push(`# Model: ${meta.model}`);
    lines.push("");
  }

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

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
