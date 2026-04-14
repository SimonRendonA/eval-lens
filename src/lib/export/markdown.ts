import { EvaluationResult, ExportMeta, FailureReason } from "../types";

/**
 * Markdown exporter.
 *
 * Builds a richer, mode-aware report with run context, highlights, failure
 * breakdown, and per-row detail blocks for docs/issues/PRs.
 */
export function exportToMarkdown(
  result: EvaluationResult,
  meta?: ExportMeta,
): string {
  const { summary } = result;
  const passPercent = Math.round(summary.passRate * 100);
  const timestamp = new Date().toISOString().split("T")[0];
  const failedRows = result.rowResults.filter((row) => row.status === "fail");
  const activeFailures = Object.entries(summary.failureReasons).filter(
    ([, count]) => count > 0,
  ) as [FailureReason, number][];
  const topFailure = [...activeFailures].sort((left, right) => right[1] - left[1])[0];

  const lines: string[] = [];

  lines.push(`# EvalLens Report`);
  lines.push(``);
  lines.push(`> Generated ${timestamp}`);
  lines.push(`> ${buildReportSubtitle(summary.failed, passPercent)}`);
  lines.push(``);

  lines.push(`## Run Context`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Mode | ${formatMode(meta?.mode)} |`);
  if (meta?.fileName) lines.push(`| File | ${meta.fileName} |`);
  if (meta?.isSample) lines.push(`| Dataset | Sample dataset |`);
  lines.push(`| Output source | ${formatOutputSource(meta)} |`);
  if (meta?.mode === "self-hosted") {
    lines.push(`| Provider | ${meta.provider ?? "Not recorded"} |`);
    lines.push(`| Model | ${meta.model ? `\`${meta.model}\`` : "Not recorded"} |`);
    lines.push(`| Generated rows | ${meta.generatedRowCount ?? 0} |`);
  }
  lines.push(``);

  lines.push(`## Highlights`);
  lines.push(``);
  lines.push(`| Signal | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Overall status | ${passPercent === 100 ? "All rows passed" : `${summary.failed} rows need attention`} |`);
  lines.push(`| Rows reviewed | ${summary.total} |`);
  lines.push(`| Failure rate | ${100 - passPercent}% |`);
  lines.push(`| Top failure reason | ${topFailure ? `${topFailure[0]} (${topFailure[1]})` : "None"} |`);
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
        : row.failures.map((failure) => `\`${failure.reason}\`: ${failure.field}`).join(", ");
    lines.push(`| ${row.id} | ${row.status} | ${failures} |`);
  }

  lines.push(``);

  if (failedRows.length > 0) {
    lines.push(`## Failure Details`);
    lines.push(``);

    for (const row of failedRows) {
      lines.push(`### Row ${row.id}`);
      lines.push(``);
      for (const failure of row.failures) {
        lines.push(`- **${failure.reason}** on \`${failure.field}\``);
        lines.push(`  - Expected: \`${formatValue(failure.expected)}\``);
        lines.push(`  - Actual: \`${formatValue(failure.actual)}\``);
      }
      lines.push(``);
    }
  }

  if (meta?.narrative) {
    lines.push(`## Failure Analysis`);
    lines.push(``);
    lines.push(meta.narrative.summary);
    lines.push(``);

    if (meta.narrative.patterns.length > 0) {
      lines.push(`### Patterns`);
      lines.push(``);
      for (const pattern of meta.narrative.patterns) {
        lines.push(`- **${pattern.title}**`);
        lines.push(`  - ${pattern.description}`);
        lines.push(`  - Affected rows: ${pattern.affectedCount}`);
        if (pattern.exampleIds.length > 0) {
          lines.push(`  - Example IDs: ${pattern.exampleIds.join(", ")}`);
        }
      }
      lines.push(``);
    }

    lines.push(`### Recommended Next Step`);
    lines.push(``);
    lines.push(meta.narrative.recommendation);
    lines.push(``);
  }

  return lines.join("\n");
}

function buildReportSubtitle(failedCount: number, passPercent: number): string {
  if (failedCount === 0) {
    return `Evaluation complete. Pass rate: ${passPercent}%.`;
  }

  return `${failedCount} rows failed validation. Pass rate: ${passPercent}%.`;
}

function formatMode(mode?: ExportMeta["mode"]): string {
  return mode === "self-hosted" ? "Self-hosted" : "Hosted";
}

function formatOutputSource(meta?: ExportMeta): string {
  if (meta?.mode === "self-hosted" && meta.outputSource === "generated") {
    return "Provider-generated actuals";
  }

  return "Uploaded actuals";
}

function formatValue(value: unknown): string {
  return JSON.stringify(value);
}
