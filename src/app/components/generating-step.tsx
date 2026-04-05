"use client";

import { useState } from "react";
import { AvailableProvider } from "@/lib/providers";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export function GeneratingStep({
  availableProviders,
  rowCount,
  generationProgress,
  generationTotal,
  onGenerate,
  onBack,
}: {
  availableProviders: AvailableProvider[];
  rowCount: number;
  generationProgress: number;
  generationTotal: number;
  onGenerate: (providerId: string, model: string) => void;
  onBack: () => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState<string>(
    availableProviders[0]?.id ?? "",
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    availableProviders[0]?.config.defaultModel ?? "",
  );

  const isGenerating = generationTotal > 0;
  const progressPercent =
    generationTotal > 0
      ? Math.round((generationProgress / generationTotal) * 100)
      : 0;

  const currentProvider = availableProviders.find(
    (p) => p.id === selectedProvider,
  );

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    const provider = availableProviders.find((p) => p.id === value);
    if (provider) {
      setSelectedModel(provider.config.defaultModel);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Generate outputs</h2>
        <p className="mt-1 text-muted-foreground">
          {rowCount} row{rowCount !== 1 ? "s" : ""} need actual outputs
          generated via AI.
        </p>
      </div>

      {!isGenerating ? (
        <>
          <div className="space-y-4 rounded-lg border border-border bg-surface p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Provider
              </label>
              <Select
                value={selectedProvider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Model
              </label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentProvider?.config.availableModels.map((m) => (
                    <SelectItem key={m} value={m}>
                      <span className="font-mono text-sm">{m}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button
              onClick={() => onGenerate(selectedProvider, selectedModel)}
              className="bg-gradient-to-r from-brand to-brand-accent text-black hover:opacity-90"
            >
              Generate Outputs
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-4 rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Generating with{" "}
              <span className="font-mono text-brand">{selectedModel}</span>
            </span>
            <span className="font-mono text-muted-foreground">
              {generationProgress} / {generationTotal}
            </span>
          </div>
          <Progress value={progressPercent} />
          <p className="text-center text-xs text-text-muted">
            {progressPercent}% complete
          </p>
        </div>
      )}
    </div>
  );
}
