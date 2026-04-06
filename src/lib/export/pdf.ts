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

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

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

  // Provider/model
  let y = 40;
  if (meta?.provider || meta?.model) {
    const parts: string[] = [];
    if (meta.provider) parts.push(`Provider: ${meta.provider}`);
    if (meta.model) parts.push(`Model: ${meta.model}`);
    doc.setTextColor(...BRAND);
    doc.setFontSize(10);
    doc.text(parts.join("  ·  "), 16, 38);
    y = 48;
  }

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

  // Failure breakdown
  const activeFailures = Object.entries(summary.failureReasons).filter(
    ([, count]) => count > 0,
  ) as [FailureReason, number][];

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

  // Row results
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TEXT);
  doc.text("Row results", 16, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["ID", "Status", "Failures"]],
    body: result.rowResults.map((row) => [
      row.id,
      row.status.toUpperCase(),
      row.failures.length === 0
        ? "—"
        : row.failures.map((f) => `${f.reason}: ${f.field}`).join(", "),
    ]),
    margin: { left: 16, right: 16 },
    styles: { ...tableStyles, fontSize: 8, overflow: "linebreak" as const },
    headStyles,
    alternateRowStyles: altStyles,
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 20 },
      2: { cellWidth: "auto" },
    },
    didDrawPage: (data) => {
      // Fill background on overflow pages before table draws
      if (data.pageNumber > 1) {
        fillPageBg(doc);
      }
    },
    willDrawCell: (data) => {
      // Color pass/fail status cells
      if (data.section === "body" && data.column.index === 1) {
        const val = data.cell.raw as string;
        if (val === "PASS") {
          data.cell.styles.textColor = PASS;
        } else if (val === "FAIL") {
          data.cell.styles.textColor = FAIL;
        }
      }
    },
  });

  // Footer on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_SEC);
    doc.text("EvalLens", 16, pageHeight - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 16, pageHeight - 8, {
      align: "right",
    });
  }

  doc.save(`evallens-report-${timestamp}.pdf`);
}
