"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NarrativeStatus, NarrativeResponse } from "@/lib/narrative";

/**
 * Failure Analysis panel rendered below the results table in self-hosted mode.
 *
 * Displays an AI-generated narrative of why evaluation rows failed.
 * Purposefully non-reusable: props are scoped entirely to this feature.
 */
export function NarrativePanel({
  narrativeStatus,
  narrative,
  narrativeError,
  failedCount,
  onTrigger,
}: {
  narrativeStatus: NarrativeStatus;
  narrative: NarrativeResponse | null;
  narrativeError: string | null;
  failedCount: number;
  onTrigger: () => void;
}) {
  const hasFailures = failedCount > 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">Failure Analysis</h3>
      </div>

      {/* Idle state */}
      {narrativeStatus === "idle" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate a plain-English explanation of what&apos;s causing your
            failures.
          </p>
          <div className="relative inline-block">
            <Button
              onClick={onTrigger}
              disabled={!hasFailures}
              className="bg-gradient-to-r from-brand to-brand-accent text-black hover:opacity-90 disabled:opacity-40"
              title={
                !hasFailures ? "Run an evaluation first" : undefined
              }
            >
              Analyse Failures
            </Button>
            {!hasFailures && (
              <p className="mt-2 text-xs text-muted-foreground">
                Run an evaluation first
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {narrativeStatus === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analysing failure patterns…</span>
        </div>
      )}

      {/* Error state */}
      {narrativeStatus === "error" && (
        <div className="space-y-3">
          <p className="text-sm text-fail">
            Analysis failed: {narrativeError}
          </p>
          <Button variant="outline" size="sm" onClick={onTrigger}>
            Try again
          </Button>
        </div>
      )}

      {/* Success state */}
      {narrativeStatus === "success" && narrative && (
        <div className="space-y-5">
          {/* Summary */}
          <p className="text-sm text-muted-foreground">{narrative.summary}</p>

          {/* Patterns */}
          {narrative.patterns.length > 0 && (
            <div className="space-y-4">
              {narrative.patterns.map((pattern, i) => (
                <div key={pattern.title}>
                  {i > 0 && <div className="mb-4 border-t border-border" />}
                  <p className="text-sm font-semibold">{pattern.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pattern.description}
                  </p>
                  <p className="mt-1.5 text-xs text-text-secondary">
                    {pattern.affectedCount} row
                    {pattern.affectedCount !== 1 ? "s" : ""} affected
                    {pattern.exampleIds.length > 0 && (
                      <>
                        {" · "}e.g.{" "}
                        {pattern.exampleIds.reduce<ReactNode[]>(
                          (acc, id, idx) => {
                            if (idx > 0) {
                              acc.push(", ");
                            }
                            acc.push(
                              <span key={id} className="font-mono">
                                {id}
                              </span>,
                            );
                            return acc;
                          },
                          [],
                        )}
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Recommendation */}
          <div className="border-l-2 border-brand bg-brand/5 py-2 pl-4 pr-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">
              Recommended next step
            </p>
            <p className="text-sm text-foreground">{narrative.recommendation}</p>
          </div>

          {/* Re-analyse */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={onTrigger}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Re-analyse
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
