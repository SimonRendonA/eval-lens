"use client";

import { EvaluationResult, ExportMeta } from "@/lib/types";
import {
  exportToCsv,
  exportToJson,
  exportToMarkdown,
  exportToPdf,
  downloadFile,
} from "@/lib/export";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Export action menu for evaluated results.
 *
 * Provides one-click downloads in CSV/JSON/Markdown and PDF generation,
 * preserving optional provider/model metadata in exported outputs.
 */

const timestamp = () => new Date().toISOString().split("T")[0];

export function ExportMenu({
  result,
  meta,
}: {
  result: EvaluationResult;
  meta?: ExportMeta;
}) {
  const handleExport = (format: "csv" | "json" | "markdown" | "pdf") => {
    const ts = timestamp();

    switch (format) {
      case "csv":
        downloadFile(
          exportToCsv(result, meta),
          `evallens-report-${ts}.csv`,
          "text/csv",
        );
        break;
      case "json":
        downloadFile(
          exportToJson(result, meta),
          `evallens-report-${ts}.json`,
          "application/json",
        );
        break;
      case "markdown":
        downloadFile(
          exportToMarkdown(result, meta),
          `evallens-report-${ts}.md`,
          "text/markdown",
        );
        break;
      case "pdf":
        exportToPdf(result, meta);
        break;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Export</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <button
          onClick={() => handleExport("csv")}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-elevated"
        >
          <span className="font-mono text-xs text-text-muted">.csv</span>
          <span>CSV</span>
        </button>
        <button
          onClick={() => handleExport("json")}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-elevated"
        >
          <span className="font-mono text-xs text-text-muted">.json</span>
          <span>JSON</span>
        </button>
        <button
          onClick={() => handleExport("markdown")}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-elevated"
        >
          <span className="font-mono text-xs text-text-muted">.md</span>
          <span>Markdown</span>
        </button>
        <button
          onClick={() => handleExport("pdf")}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition hover:bg-elevated"
        >
          <span className="font-mono text-xs text-text-muted">.pdf</span>
          <span>PDF</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}
