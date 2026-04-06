import { EvaluationResult, ExportMeta, FailureReason } from "../types";

/**
 * Markdown exporter.
 *
 * Builds a human-readable report with summary tables, failure breakdown, and
 * optional per-row failure details for sharing in docs/issues/PRs.
 */


export function exportToMarkdown(
  result: EvaluationResult,
  meta?: ExportMeta,
): string {
  const { summary } = result;
  const passPercent = Math.round(summary.passRate * 100);
  const timestamp = new Date().toISOString().split("T")[0];

  const lines: string[] = [];

  lines.push(`# EvalLens Report`);
  lines.push(``);
  lines.push(`Generated: ${timestamp}`);
  if (meta?.provider) lines.push(`Provider: ${meta.provider}`);
  if (meta?.model) lines.push(`Model: \`${meta.model}\``);
  lines.push(``);

  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total rows | ${summary.total} |`);
  lines.push(`| Passed | ${summary.passed} |`);
  lines.push(`| Failed | ${summary.failed} |`);
  lines.push(`| Pass rate | ${passPercent}% |`);
  lines.push(``);

  const activeFailures = Object.entries(summary.failureReasons).filter(
    ([, count]) => count > 0,
  ) as [FailureReason, number][];

  if (activeFailures.length > 0) {
    lines.push(`## Failure Breakdown`);
    lines.push(``);
    lines.push(`| Reason | Count |`);
    lines.push(`|--------|-------|`);
    for (const [reason, count] of activeFailures) {
      lines.push(`| ${reason} | ${count} |`);
    }
    lines.push(``);
  }

  lines.push(`## Row Results`);
  lines.push(``);
  lines.push(`| ID | Status | Failures |`);
  lines.push(`|----|--------|----------|`);

  for (const row of result.rowResults) {
    const failures =
      row.failures.length === 0
        ? "—"
        : row.failures.map((f) => `\`${f.reason}\`: ${f.field}`).join(", ");
    lines.push(`| ${row.id} | ${row.status} | ${failures} |`);
  }

  lines.push(``);

  const failedRows = result.rowResults.filter((r) => r.status === "fail");

  if (failedRows.length > 0) {
    lines.push(`## Failure Details`);
    lines.push(``);

    for (const row of failedRows) {
      lines.push(`### Row ${row.id}`);
      lines.push(``);
      for (const f of row.failures) {
        lines.push(`- **${f.reason}** on \`${f.field}\``);
        lines.push(`  - Expected: \`${JSON.stringify(f.expected)}\``);
        lines.push(`  - Actual: \`${JSON.stringify(f.actual)}\``);
      }
      lines.push(``);
    }
  }

  return lines.join("\n");
}
