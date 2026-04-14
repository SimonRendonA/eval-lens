"use client";

import { useState, useEffect, useRef } from "react";
import { evaluateDataset } from "@/lib/evaluator";
import { parseFile } from "@/lib/parsers";
import { inferSchema } from "@/lib/schema";
import { generateWithStream } from "@/lib/generate-stream";
import {
  RawDatasetRow,
  InferredSchema,
  EvaluationResult,
  ParseError,
} from "@/lib/types";
import { AvailableProvider } from "@/lib/providers";
import type {
  NarrativeStatus,
  NarrativeResponse,
  NarrativeRequest,
  NarrativeRow,
} from "@/lib/narrative";

/**
 * Main client-side orchestration hook for EvalLens.
 *
 * Owns the end-to-end workflow state machine:
 * upload -> schema -> generating? -> evaluating -> results
 * and coordinates parsing, schema inference, optional generation, and scoring.
 */

type Step = "upload" | "schema" | "generating" | "evaluating" | "results";

export default function useEvaluation() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<RawDatasetRow[]>([]);
  // AbortController for the active generation stream — cancelled on reset or new upload
  const generateAbortRef = useRef<AbortController | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [schema, setSchema] = useState<InferredSchema | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(false);
  

  // Self-hosted state
  const [mode, setMode] = useState<"hosted" | "self-hosted">("hosted");
  const [availableProviders, setAvailableProviders] = useState<
    AvailableProvider[]
  >([]);
  const [selectedProvider, setSelectedProvider] = useState<
    AvailableProvider["id"] | null
  >(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [generatedRowCount, setGeneratedRowCount] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationTotal, setGenerationTotal] = useState(0);

  // Narrative state
  const [narrativeStatus, setNarrativeStatus] =
    useState<NarrativeStatus>("idle");
  const [narrative, setNarrative] = useState<NarrativeResponse | null>(null);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);

  // Fetch config on mount
  useEffect(() => {
    fetch("/eval-lens/api/config")
      .then((res) => res.json())
      .then((data) => {
        setMode(data.mode);
        setAvailableProviders(data.providers);
        setSelectedProvider((currentProvider) => {
          if (currentProvider) {
            return currentProvider;
          }

          return data.providers[0]?.id ?? null;
        });
        setSelectedModel((currentModel) => {
          if (currentModel) {
            return currentModel;
          }

          return data.providers[0]?.config.defaultModel ?? null;
        });
      })
      .catch(() => {
        // Default to hosted if config fails
        setMode("hosted");
      });
  }, []);

  const handleFileUpload = (uploadedFile: File, sample = false) => {
    setError(null);
    setFile(uploadedFile);
    setIsSample(sample);
    setGeneratedRowCount(0);
    setNarrativeStatus("idle");
    setNarrative(null);
    setNarrativeError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== "string") {
        setError("Failed to read file content");
        return;
      }

      try {
        const { rows, errors } = parseFile(content, uploadedFile.name);
        setRawRows(rows);
        setParseErrors(errors);

        const inferredSchema = inferSchema(rows);
        setSchema(inferredSchema);
        setStep("schema");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    reader.onerror = () => setError("Error reading file");
    reader.readAsText(uploadedFile);
  };

  const needsGeneration = rawRows.some(
    (row) => !row.actual || row.actual === "",
  );

  const confirmSchema = () => {
    if (!schema) return;

    if (needsGeneration) {
      if (mode === "self-hosted" && availableProviders.length > 0) {
        setStep("generating");
      } else {
        setError(
          mode === "hosted"
            ? "The 'actual' column is required in hosted mode. Upload a file with expected and actual columns, or use self-hosted mode to generate outputs."
            : "No AI providers configured. Set at least one API key in your environment variables.",
        );
      }
      return;
    }

    setNarrativeStatus("idle");
    setNarrative(null);
    setNarrativeError(null);
    setStep("evaluating");
    // Defer evaluation by one frame so React can paint the "evaluating" spinner
    // before the synchronous work blocks the main thread.
    // NOTE: for very large datasets (>1 000 rows) this will still cause a
    // perceptible freeze. Moving evaluation to a Web Worker is the long-term fix.
    setTimeout(() => {
      const evalResult = evaluateDataset(rawRows, schema);
      setResult(evalResult);
      setStep("results");
    }, 0);
  };

  const handleGenerate = (providerId: string, model: string) => {
    if (!schema) return;
    if (
      !["openai", "anthropic", "gemini"].includes(providerId)
    ) return;
    const validProviderId = providerId as AvailableProvider["id"];

    const rowsToGenerate = rawRows
      .filter((row) => !row.actual || row.actual === "")
      .map((row) => ({ id: row.id, prompt: row.prompt }));

    setSelectedProvider(validProviderId);
    setSelectedModel(model);
    setGeneratedRowCount(rowsToGenerate.length);
    setGenerationProgress(0);
    setGenerationTotal(rowsToGenerate.length);

    // Cancel any in-flight stream before starting a new one
    generateAbortRef.current?.abort();
    const abortController = new AbortController();
    generateAbortRef.current = abortController;

    generateWithStream(rowsToGenerate, providerId, model, {
      onProgress: (index, total) => {
        setGenerationProgress(index + 1);
        setGenerationTotal(total);
      },
      onComplete: (completedRows) => {
        // Merge generated actuals into rawRows
        const actualMap = new Map(completedRows.map((r) => [r.id, r.actual]));

        const mergedRows = rawRows.map((row) => {
          if (!row.actual || row.actual === "") {
            return { ...row, actual: actualMap.get(row.id) ?? "" };
          }
          return row;
        });

        setRawRows(mergedRows);
        setSelectedProvider(validProviderId);
        setSelectedModel(model);
        setNarrativeStatus("idle");
        setNarrative(null);
        setNarrativeError(null);
        setStep("evaluating");

        // Same deferred-evaluation pattern as confirmSchema — see note above.
        setTimeout(() => {
          const evalResult = evaluateDataset(mergedRows, schema);
          setResult(evalResult);
          setStep("results");
        }, 0);
      },
      onError: (errorMsg) => {
        setError(errorMsg);
        setStep("schema");
      },
    }, abortController.signal);
  };

  const triggerNarrative = async () => {
    if (!result || !selectedProvider) return;
    if (narrativeStatus === "loading") return;

    setNarrativeStatus("loading");
    setNarrativeError(null);

    const failedRowResults = result.rowResults.filter(
      (r) => r.status === "fail",
    );
    const rawRowMap = new Map(rawRows.map((r) => [r.id, r]));

    const failureBreakdown: Record<string, number> = {};
    const failedRows: NarrativeRow[] = failedRowResults.map((row) => {
      const raw = rawRowMap.get(row.id);
      const failureReasons = row.failures.map((f) => f.reason as string);
      const fieldFailures: Record<string, string> = {};
      for (const f of row.failures) {
        fieldFailures[f.field] = f.reason;
      }
      for (const reason of failureReasons) {
        failureBreakdown[reason] = (failureBreakdown[reason] ?? 0) + 1;
      }
      return {
        id: row.id,
        ...(raw?.prompt ? { prompt: raw.prompt } : {}),
        expected: raw?.expected ?? "",
        actual: raw?.actual ?? "",
        failureReasons,
        ...(Object.keys(fieldFailures).length > 0 ? { fieldFailures } : {}),
      };
    });

    const request: NarrativeRequest = {
      failedRows,
      totalRows: result.summary.total,
      failedCount: result.summary.failed,
      passedCount: result.summary.passed,
      failureBreakdown,
      provider: selectedProvider,
    };

    try {
      const res = await fetch("/eval-lens/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const data = await res.json();
        setNarrativeStatus("error");
        setNarrativeError(
          typeof data.error === "string" ? data.error : "Unknown error",
        );
        return;
      }

      const narrativeData = (await res.json()) as NarrativeResponse;
      setNarrative(narrativeData);
      setNarrativeStatus("success");
    } catch (err) {
      setNarrativeStatus("error");
      setNarrativeError(
        err instanceof Error ? err.message : "Network error",
      );
    }
  };

  const reset = () => {
    // Cancel any in-flight generation stream
    generateAbortRef.current?.abort();
    generateAbortRef.current = null;
    setStep("upload");
    setFile(null);
    setRawRows([]);
    setParseErrors([]);
    setSchema(null);
    setResult(null);
    setError(null);
    setSelectedProvider(null);
    setSelectedModel(null);
    setGeneratedRowCount(0);
    setGenerationProgress(0);
    setGenerationTotal(0);
    setIsSample(false);
    setNarrativeStatus("idle");
    setNarrative(null);
    setNarrativeError(null);
  };

  return {
    step,
    file,
    rawRows,
    parseErrors,
    schema,
    result,
    error,
    mode,
    availableProviders,
    selectedProvider,
    selectedModel,
    generatedRowCount,
    needsGeneration,
    generationProgress,
    generationTotal,
    isSample,
    narrativeStatus,
    narrative,
    narrativeError,
    handleFileUpload,
    confirmSchema,
    handleGenerate,
    triggerNarrative,
    reset,
    setError,
  };
}
