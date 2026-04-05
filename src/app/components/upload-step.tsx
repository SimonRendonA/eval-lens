"use client";

import { useRef, useState, DragEvent } from "react";
import { ParseWarnings } from "./parse-warnings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function UploadStep({
  error,
  parseErrors,
  onFileUpload,
}: {
  error: string | null;
  parseErrors: { row: number | string; message: string }[];
  onFileUpload: (file: File, isSample: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sampleDatasets = [
    {
      filename: "hosted-classification.jsonl",
      mimeType: "application/x-ndjson",
      label: "Classification (JSONL)",
    },
    { filename: "hosted-mixed-results.csv", mimeType: "text/csv", label: "Mixed Results (CSV)" },
    { filename: "hosted-stress-1000.csv", mimeType: "text/csv", label: "Stress Test (CSV)" },
  ] as const;

  const [selectedSample, setSelectedSample] = useState<string>(
    sampleDatasets[1].filename,
  );

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) onFileUpload(droppedFile, false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) onFileUpload(selectedFile, false);
  };

  /**
   * On the upload step, add a link below the drop zone like "No file? Try a sample dataset." Clicking it fetches the sample CSV from public/samples/, creates a File object from it, and passes it to handleFileUpload — so the user goes straight through the normal flow (schema confirmation → evaluation → results) without needing their own file.
   * possible files: hosted-classification.jsonl , hosted-mixed-results.csv, hosted-stress-1000.csv
   */
  const handleUseSample = () => {
    const sample = sampleDatasets.find((s) => s.filename === selectedSample);
    const filename = sample?.filename ?? sampleDatasets[1].filename;
    const mimeType = sample?.mimeType ?? "text/plain";

    fetch(`/eval-lens/samples/${filename}`)
      .then((res) => res.text())
      .then((text) => {
        const sampleFile = new File([text], filename, { type: mimeType });
        onFileUpload(sampleFile, true);
      })
      .catch(() => {
        // Handle error if sample file fails to load
        alert("Failed to load sample dataset. Please try again.");
      });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Evaluate your outputs</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a CSV or JSONL file with{" "}
          <code className="font-mono text-brand">id</code>,{" "}
          <code className="font-mono text-brand">prompt</code>,{" "}
          <code className="font-mono text-brand">expected</code>, and{" "}
          <code className="font-mono text-brand">actual</code> columns.
        </p>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-16 text-center transition ${
          isDragging
            ? "border-brand bg-brand/5"
            : "border-border hover:border-text-muted"
        }`}
      >
        <div className="space-y-3">
          <svg
            className="mx-auto h-12 w-12 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-lg">
            Drop your file here, or{" "}
            <span className="text-brand underline underline-offset-4">
              browse
            </span>
          </p>
          <p className="text-sm text-text-muted">CSV, JSON, or JSONL</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,.jsonl"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-fail/30 bg-fail/10 px-4 py-3 text-sm text-fail">
          {error}
        </div>
      )}

      {parseErrors.length > 0 && <ParseWarnings errors={parseErrors} />}

      <div className="text-center">
        <div className="mx-auto mb-3 w-full max-w-sm space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Sample dataset
          </label>
          <Select value={selectedSample} onValueChange={setSelectedSample}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sampleDatasets.map((s) => (
                <SelectItem key={s.filename} value={s.filename}>
                  <span className="font-mono text-sm">{s.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mx-auto w-full max-w-sm"
          onClick={handleUseSample}
        >
          Use sample dataset
        </Button>
      </div>
    </div>
  );
}
