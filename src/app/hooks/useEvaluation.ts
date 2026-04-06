"use client";

import { useState, useEffect } from "react";
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
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationTotal, setGenerationTotal] = useState(0);

  // Fetch config on mount
  useEffect(() => {
    fetch("/eval-lens/api/config")
      .then((res) => res.json())
      .then((data) => {
        setMode(data.mode);
        setAvailableProviders(data.providers);
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

    setStep("evaluating");
    setTimeout(() => {
      const evalResult = evaluateDataset(rawRows, schema);
      setResult(evalResult);
      setStep("results");
    }, 0);
  };

  const handleGenerate = (providerId: string, model: string) => {
    if (!schema) return;

    const rowsToGenerate = rawRows
      .filter((row) => !row.actual || row.actual === "")
      .map((row) => ({ id: row.id, prompt: row.prompt }));

    setGenerationProgress(0);
    setGenerationTotal(rowsToGenerate.length);

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
        setStep("evaluating");

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
    });
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setRawRows([]);
    setParseErrors([]);
    setSchema(null);
    setResult(null);
    setError(null);
    setGenerationProgress(0);
    setGenerationTotal(0);
    setIsSample(false);
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
    needsGeneration,
    generationProgress,
    generationTotal,
    isSample,
    handleFileUpload,
    confirmSchema,
    handleGenerate,
    reset,
  };
}
