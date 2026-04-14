import { EvaluationResult, FailureReason, ExportMeta } from "../types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * PDF exporter.
 *
 * Generates a branded multi-page report (dark theme) with summary cards,
 * failure tables, and paginated row details using jsPDF + autotable.
 */

const BRAND: [number, number, number] = [0, 212, 170];
const PASS: [number, number, number] = [34, 197, 94];
const FAIL: [number, number, number] = [239, 68, 68];
const DARK_BG: [number, number, number] = [12, 13, 16];
const SURFACE: [number, number, number] = [22, 24, 32];
const SURFACE_SOFT: [number, number, number] = [28, 30, 38];
const TEXT: [number, number, number] = [232, 234, 237];
const TEXT_SEC: [number, number, number] = [139, 143, 163];
const BORDER: [number, number, number] = [42, 45, 56];

function fillPageBg(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, w, h, "F");
}

export function exportToPdf(result: EvaluationResult, meta?: ExportMeta): void {
  const { summary } = result;
  const passPercent = Math.round(summary.passRate * 100);
  const timestamp = new Date().toISOString().split("T")[0];
  const activeFailures = Object.entries(summary.failureReasons).filter(
    ([, count]) => count > 0,
  ) as [FailureReason, number][];
  const topFailure = [...activeFailures].sort((left, right) => right[1] - left[1])[0];
  const failedRows = result.rowResults.filter((row) => row.status === "fail");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Page 1 background
  fillPageBg(doc);

  // Teal accent bar at top
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 2, "F");

  // Title
  doc.setTextColor(...TEXT);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("EvalLens Report", 16, 22);

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_SEC);
  doc.text(`Generated ${timestamp}`, 16, 30);

  doc.setDrawColor(...BORDER);
  doc.setFillColor(...SURFACE_SOFT);
  const runContextLines = doc.splitTextToSize(
    `${formatMode(meta?.mode)} mode  ·  ${formatOutputSource(meta)}${meta?.fileName ? `  ·  ${meta.fileName}` : ""}`,
    pageWidth - 40,
  );
  const topBannerHeight = Math.max(20, 10 + runContextLines.length * 4);
  doc.roundedRect(16, 35, pageWidth - 32, topBannerHeight, 3, 3, "FD");
  doc.setTextColor(...TEXT);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(buildOverview(summary.failed, passPercent), 20, 43);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TEXT_SEC);
  doc.text(runContextLines, 20, 49);

  let y = 43 + topBannerHeight;

  // Summary cards
  const cardWidth = (pageWidth - 48) / 4;
  const cards = [
    { label: "Total", value: String(summary.total), color: TEXT },
    { label: "Passed", value: String(summary.passed), color: PASS },
    { label: "Failed", value: String(summary.failed), color: FAIL },
    { label: "Pass Rate", value: `${passPercent}%`, color: TEXT },
  ];

  cards.forEach((card, i) => {
    const x = 16 + i * (cardWidth + 5);
    doc.setFillColor(...SURFACE);
    doc.roundedRect(x, y, cardWidth, 22, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_SEC);
    doc.text(card.label, x + 4, y + 8);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 4, y + 18);
    doc.setFont("helvetica", "normal");
  });

  y += 32;

  const contextPanelHeight = drawContextPanel(
    doc,
    16,
    y,
    pageWidth - 32,
    meta,
    topFailure,
  );
  y += contextPanelHeight + 8;

  // Shared table config
  const tableStyles = {
    fillColor: SURFACE,
    textColor: TEXT,
    fontSize: 9,
    cellPadding: 3,
    lineWidth: 0.1,
    lineColor: BORDER,
  };

  const headStyles = {
    fillColor: SURFACE,
    textColor: BRAND,
    fontStyle: "bold" as const,
  };

  const altStyles = { fillColor: DARK_BG };

  if (activeFailures.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT);
    doc.text("Failure breakdown", 16, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["Reason", "Count"]],
      body: activeFailures.map(([reason, count]) => [reason, String(count)]),
      margin: { left: 16, right: 16 },
      styles: tableStyles,
      headStyles,
      alternateRowStyles: altStyles,
    });

    y =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 10;
  }

  if (failedRows.length > 0) {
    y = ensurePageSpace(doc, y, pageHeight, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT);
    doc.text("Failure detail snapshot", 16, y);
    y += 8;

    const lineH = 4.5;
    const labelIndent = 20;
    const valueIndent = 26;
    const valueWidth = pageWidth - valueIndent - 16;

    for (const row of failedRows) {
      for (const failure of row.failures) {
        // Row header bar
        y = ensurePageSpace(doc, y, pageHeight, 30);
        doc.setFillColor(...SURFACE);
        doc.rect(16, y - 3.5, pageWidth - 32, 7, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND);
        doc.text(`Row ${row.id}  ·  ${failure.reason}  ·  ${failure.field}`, labelIndent, y);
        y += 6;

        // Expected value
        const expectedStr = formatCellValue(failure.expected);
        const expectedLines = doc.splitTextToSize(expectedStr, valueWidth);
        const expectedBlock = (expectedLines.length + 1) * lineH + 3;
        y = ensurePageSpace(doc, y, pageHeight, expectedBlock);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT_SEC);
        doc.text("Expected", labelIndent, y);
        y += lineH;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT);
        doc.text(expectedLines, valueIndent, y);
        y += expectedLines.length * lineH + 2;

        // Actual value
        const actualStr = formatCellValue(failure.actual);
        const actualLines = doc.splitTextToSize(actualStr, valueWidth);
        const actualBlock = (actualLines.length + 1) * lineH + 3;
        y = ensurePageSpace(doc, y, pageHeight, actualBlock);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...TEXT_SEC);
        doc.text("Actual", labelIndent, y);
        y += lineH;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...TEXT);
        doc.text(actualLines, valueIndent, y);
        y += actualLines.length * lineH + 4;

        // Divider
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.2);
        doc.line(16, y, pageWidth - 16, y);
        y += 4;
      }
    }

    y += 4;
  }

  if (meta?.narrative) {
    y = ensurePageSpace(doc, y, pageHeight, 45);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TEXT);
    doc.text("Failure analysis", 16, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    const summaryLines = doc.splitTextToSize(meta.narrative.summary, pageWidth - 32);
    doc.text(summaryLines, 16, y);
    y += summaryLines.length * 4 + 4;

    for (const pattern of meta.narrative.patterns) {
      const patternText = `${pattern.description} Affected rows: ${pattern.affectedCount}.${pattern.exampleIds.length > 0 ? ` Examples: ${pattern.exampleIds.join(", ")}.` : ""}`;
      const descriptionLines = doc.splitTextToSize(patternText, pageWidth - 32);
      y = ensurePageSpace(doc, y, pageHeight, 12 + descriptionLines.length * 4 + 8);

      doc.setFont("helvetica", "bold");
      doc.text(pattern.title, 16, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TEXT_SEC);
      doc.text(descriptionLines, 16, y);
      y += descriptionLines.length * 4 + 3;
      doc.setTextColor(...TEXT);
    }

    const recommendationLines = doc.splitTextToSize(
      meta.narrative.recommendation,
      pageWidth - 40,
    );
    const recommendationHeight = Math.max(18, recommendationLines.length * 4 + 10);
    y = ensurePageSpace(doc, y, pageHeight, recommendationHeight + 6);

    doc.setDrawColor(...BRAND);
    doc.setFillColor(...SURFACE_SOFT);
    doc.roundedRect(16, y, pageWidth - 32, recommendationHeight, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND);
    doc.text("Recommended next step", 20, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT);
    doc.text(recommendationLines, 20, y + 12);
    y += recommendationHeight + 8;
  }

  // Row results
  y = ensurePageSpace(doc, y, pageHeight, 24);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT);
  doc.text("Row results", 16, y);
  y += 6;

  // Column header row
  doc.setFillColor(...SURFACE);
  doc.rect(16, y - 4, pageWidth - 32, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND);
  doc.text("ID", 20, y);
  doc.text("STATUS", 36, y);
  doc.text("FAILURES", 68, y);
  y += 5;

  const lineH2 = 4.5;
  const failuresWidth = pageWidth - 68 - 16;
  let rowAlt = false;

  for (const row of result.rowResults) {
    const failureLines =
      row.failures.length === 0
        ? ["—"]
        : row.failures.flatMap((f) =>
            doc.splitTextToSize(`${f.reason}: ${f.field}`, failuresWidth),
          );
    const rowHeight = Math.max(7, failureLines.length * lineH2 + 3);
    y = ensurePageSpace(doc, y, pageHeight, rowHeight + 2);

    // Row background
    doc.setFillColor(...(rowAlt ? DARK_BG : SURFACE));
    doc.rect(16, y - 4, pageWidth - 32, rowHeight, "F");
    rowAlt = !rowAlt;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    // ID
    doc.setTextColor(...TEXT);
    doc.text(String(row.id), 20, y);

    // Status
    doc.setTextColor(...(row.status === "pass" ? PASS : FAIL));
    doc.text(row.status.toUpperCase(), 36, y);

    // Failures column — full text, wrapped
    doc.setTextColor(...(row.failures.length === 0 ? TEXT_SEC : TEXT));
    doc.text(failureLines, 68, y);

    y += rowHeight - 1;
  }

  y += 6;

  // Footer on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_SEC);
    doc.text("EvalLens", 16, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 16, pageHeight - 8, {
      align: "right",
    });
  }

  doc.save(`evallens-report-${timestamp}.pdf`);
}

function ensurePageSpace(
  doc: jsPDF,
  y: number,
  pageHeight: number,
  requiredHeight: number,
): number {
  if (y + requiredHeight <= pageHeight - 16) {
    return y;
  }

  doc.addPage();
  fillPageBg(doc);
  return 18;
}

function drawContextPanel(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  meta: ExportMeta | undefined,
  topFailure: [FailureReason, number] | undefined,
) {
  const fileLines = doc.splitTextToSize(
    `File: ${meta?.fileName ?? "Not recorded"}`,
    width / 2 - 8,
  );
  const modelLines = doc.splitTextToSize(
    meta?.mode === "self-hosted"
      ? `Model: ${meta?.model ?? "Not recorded"}`
      : "Model: n/a",
    width / 2 - 8,
  );
  const topFailureLines = doc.splitTextToSize(
    topFailure
      ? `Top failure: ${topFailure[0]} (${topFailure[1]})`
      : "Top failure: none",
    width / 2 - 8,
  );
  const dynamicHeight = Math.max(
    24,
    14 + Math.max(fileLines.length, modelLines.length + topFailureLines.length) * 4,
  );

  doc.setDrawColor(...BORDER);
  doc.setFillColor(...SURFACE);
  doc.roundedRect(x, y, width, dynamicHeight, 3, 3, "FD");

  const leftCol = x + 4;
  const rightCol = x + width / 2 + 2;

  doc.setFontSize(8);
  doc.setTextColor(...TEXT_SEC);
  doc.text("RUN CONTEXT", leftCol, y + 6);
  doc.text("PROFILE", rightCol, y + 6);

  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(`Mode: ${formatMode(meta?.mode)}`, leftCol, y + 12);
  doc.text(`Source: ${formatOutputSource(meta)}`, leftCol, y + 17);
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_SEC);
  doc.text(fileLines, leftCol, y + 22);

  const providerText = meta?.mode === "self-hosted"
    ? `Provider: ${meta?.provider ?? "Not recorded"}`
    : "Provider: n/a";

  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(providerText, rightCol, y + 12);
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_SEC);
  doc.text(modelLines, rightCol, y + 17);
  doc.text(topFailureLines, rightCol, y + 17 + modelLines.length * 4 + 1);

  return dynamicHeight;
}

function buildOverview(failedCount: number, passPercent: number): string {
  if (failedCount === 0) {
    return `All rows passed. Pass rate ${passPercent}%.`;
  }

  return `${failedCount} rows failed validation. Pass rate ${passPercent}%.`;
}

function formatMode(mode?: ExportMeta["mode"]): string {
  return mode === "self-hosted" ? "Self-hosted" : "Hosted";
}

function formatOutputSource(meta?: ExportMeta): string {
  if (meta?.mode === "self-hosted" && meta.outputSource === "generated") {
    return `Provider-generated actuals${meta.generatedRowCount ? ` (${meta.generatedRowCount})` : ""}`;
  }

  return "Uploaded actuals";
}

function formatCellValue(value: unknown): string {
  return JSON.stringify(value);
}
