"use client";

import { useState, useMemo } from "react";
import { FailureReason, EvaluationResult, ExportMeta } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RowInspector } from "./row-inspector";
import { ExportMenu } from "./export-menu";

export function ResultsStep({
  result,
  onReset,
  exportMeta,
  isSample,
}: {
  result: EvaluationResult;
  onReset: () => void;
  exportMeta?: ExportMeta;
  isSample?: boolean;
}) {
  const { summary } = result;
  const passPercent = Math.round(summary.passRate * 100);

  const [statusFilter, setStatusFilter] = useState<"all" | "pass" | "fail">(
    "all",
  );
  const [failureFilter, setFailureFilter] = useState<FailureReason | "all">(
    "all",
  );
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const activeFailureReasons = useMemo(
    () =>
      Object.entries(summary.failureReasons).filter(
        ([, count]) => count > 0,
      ) as [FailureReason, number][],
    [summary.failureReasons],
  );

  const filteredRows = useMemo(() => {
    return result.rowResults.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (failureFilter !== "all") {
        if (!row.failures.some((f) => f.reason === failureFilter)) return false;
      }
      return true;
    });
  }, [result.rowResults, statusFilter, failureFilter]);

  const selectedRow = useMemo(
    () => result.rowResults.find((r) => r.id === selectedRowId) ?? null,
    [result.rowResults, selectedRowId],
  );

  const selectedIndex = useMemo(
    () => filteredRows.findIndex((r) => r.id === selectedRowId),
    [filteredRows, selectedRowId],
  );

  const navigateRow = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev" ? selectedIndex - 1 : selectedIndex + 1;
    if (newIndex >= 0 && newIndex < filteredRows.length) {
      setSelectedRowId(filteredRows[newIndex].id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Results</h2>
          {isSample && <Badge variant="secondary">Sample data</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu result={result} meta={exportMeta} />
          <Button variant="outline" onClick={onReset}>
            New evaluation
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-border bg-surface py-0">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="mt-1 text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="border-pass/20 bg-pass/5 py-0">
          <CardContent className="p-4">
            <p className="text-sm text-pass">Passed</p>
            <p className="mt-1 text-2xl font-bold text-pass">
              {summary.passed}
            </p>
          </CardContent>
        </Card>
        <Card className="border-fail/20 bg-fail/5 py-0">
          <CardContent className="p-4">
            <p className="text-sm text-fail">Failed</p>
            <p className="mt-1 text-2xl font-bold text-fail">
              {summary.failed}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-surface py-0">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pass Rate</p>
            <p className="mt-1 text-2xl font-bold">{passPercent}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          {(["all", "pass", "fail"] as const).map((s) => {
            const count =
              s === "all"
                ? summary.total
                : s === "pass"
                  ? summary.passed
                  : summary.failed;
            return (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  if (s === "pass") setFailureFilter("all");
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  statusFilter === s
                    ? s === "pass"
                      ? "bg-pass/15 text-pass"
                      : s === "fail"
                        ? "bg-fail/15 text-fail"
                        : "bg-brand/15 text-brand"
                    : "bg-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}{" "}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        {statusFilter !== "pass" && activeFailureReasons.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Failure:</span>
            <button
              onClick={() => setFailureFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                failureFilter === "all"
                  ? "bg-brand/15 text-brand"
                  : "bg-elevated text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {activeFailureReasons.map(([reason, count]) => (
              <button
                key={reason}
                onClick={() => setFailureFilter(reason)}
                className={`rounded-full px-3 py-1 font-mono text-xs font-medium transition ${
                  failureFilter === reason
                    ? "bg-warning/15 text-warning"
                    : "bg-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                {reason} <span className="ml-1 opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Row results table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface hover:bg-surface">
              <TableHead className="px-4">ID</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="px-4">Failures</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => setSelectedRowId(row.id)}
                className="cursor-pointer"
              >
                <TableCell className="px-4 font-mono">{row.id}</TableCell>
                <TableCell className="px-4">
                  {row.status === "pass" ? (
                    <Badge className="bg-pass/15 text-pass hover:bg-pass/20">
                      pass
                    </Badge>
                  ) : (
                    <Badge className="bg-fail/15 text-fail hover:bg-fail/20">
                      fail
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="px-4">
                  {row.failures.length === 0 ? (
                    <span className="text-text-muted">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {row.failures.map((f, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {f.reason}: {f.field}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No rows match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Row inspection side panel */}
      <RowInspector
        row={selectedRow}
        position={selectedIndex}
        total={filteredRows.length}
        onClose={() => setSelectedRowId(null)}
        onNavigate={navigateRow}
      />
    </div>
  );
}
