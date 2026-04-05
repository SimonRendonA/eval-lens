"use client";

import Image from "next/image";
import useEvaluation from "./hooks/useEvaluation";
import { Button } from "@/components/ui/button";
import { UploadStep } from "./components/upload-step";
import { SchemaStep } from "./components/schema-step";
import { GeneratingStep } from "./components/generating-step";
import { EvaluatingStep } from "./components/evaluating-step";
import { ResultsStep } from "./components/results-step";

export default function Home() {
  const {
    step,
    file,
    rawRows,
    parseErrors,
    schema,
    result,
    error,
    mode,
    availableProviders,
    generationProgress,
    generationTotal,
    isSample,
    handleFileUpload,
    confirmSchema,
    handleGenerate,
    reset,
  } = useEvaluation();

  const rowsNeedingGeneration = rawRows.filter(
    (r) => !r.actual || r.actual === "",
  ).length;

  const scrollToUpload = () => {
    const uploadSection = document.getElementById("upload-section");
    uploadSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button onClick={reset} className="flex items-center gap-2">
            <Image
              src="/eval-lens/logo/monogram/monogram-dark.svg"
              alt="EvalLens logo"
              width={32}
              height={32}
              priority
            />
            <span className="bg-gradient-to-r from-brand to-brand-accent bg-clip-text text-xl font-bold text-transparent">
              EvalLens
            </span>
          </button>
          {step !== "upload" && (
            <Button variant="ghost" size="sm" onClick={reset}>
              ← New evaluation
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {step === "upload" && (
          <div className="space-y-12">
            <section className="relative overflow-hidden rounded-2xl border border-border bg-surface/70 p-8 sm:p-10">
              <div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
              <div className="pointer-events-none absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-brand-accent/15 blur-3xl" />

              <div className="relative flex flex-col gap-8">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl border border-brand/30 bg-elevated/80 p-2">
                    <Image
                      src="/eval-lens/logo/monogram/monogram-dark.svg"
                      alt="EvalLens logo"
                      width={48}
                      height={48}
                      priority
                    />
                  </div>
                  <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                    Structured output evaluation
                  </span>
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                    Spot LLM output failures before they reach users.
                  </h1>
                  <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                    EvalLens helps you upload datasets, score model responses,
                    and inspect row-level failures with a fast, focused workflow.
                  </p>
                </div>

                <div>
                  <Button
                    onClick={scrollToUpload}
                    className="bg-gradient-to-r from-brand to-brand-accent text-black hover:opacity-90"
                    size="lg"
                  >
                    Get started
                  </Button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">How it works</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    step: "01",
                    title: "Upload",
                    description:
                      "Bring your CSV or JSONL file with id, prompt, expected, and actual columns.",
                  },
                  {
                    step: "02",
                    title: "Evaluate",
                    description:
                      "Run automatic checks to measure pass rate and classify failure reasons.",
                  },
                  {
                    step: "03",
                    title: "Inspect",
                    description:
                      "Filter and drill into row-level results to diagnose what broke and why.",
                  },
                ].map((item) => (
                  <article
                    key={item.title}
                    className="rounded-xl border border-border bg-surface p-4"
                  >
                    <p className="text-xs font-medium tracking-wide text-brand">
                      {item.step}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">Hosted vs self-hosted</h2>
                <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                  Current mode: {mode === "hosted" ? "Hosted" : "Self-hosted"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-border bg-surface p-5">
                  <p className="text-xs font-medium tracking-wide text-brand">
                    HOSTED
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    Bring your completed outputs
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Hosted mode evaluates files that already include both
                    <span className="font-mono"> expected</span> and
                    <span className="font-mono"> actual</span> values. It is
                    fast and ideal when your generation pipeline already exists.
                  </p>
                </article>

                <article className="rounded-xl border border-border bg-surface p-5">
                  <p className="text-xs font-medium tracking-wide text-brand-accent">
                    SELF-HOSTED
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    Generate, then evaluate in one run
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Self-hosted mode can generate missing
                    <span className="font-mono"> actual</span> outputs using
                    your configured provider keys, then evaluate the results.
                    Run it yourself to keep data private and fully under your
                    control.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Best for teams that need local data boundaries,
                    environment-based provider control, or reproducible evals in
                    CI. You can bring your own keys for OpenAI, Anthropic, or
                    Gemini and switch models without changing your dataset
                    format.
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p>
                      1. Clone the repo from GitHub and run locally or in Docker.
                    </p>
                    <p>
                      2. Set <span className="font-mono">EVALLENS_MODE=self-hosted</span> and at least one provider API key.
                    </p>
                    <p>
                      3. Upload your dataset, generate missing outputs, and inspect failures row by row.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Button asChild variant="outline" className="border-brand/40">
                      <a
                        href="https://github.com/SimonRendonA/eval-lens"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on GitHub
                      </a>
                    </Button>
                  </div>
                </article>
              </div>
            </section>

            <section id="upload-section">
              <UploadStep
                error={error}
                parseErrors={parseErrors}
                onFileUpload={handleFileUpload}
              />
            </section>
          </div>
        )}
        {step === "schema" && schema && (
          <SchemaStep
            fileName={file?.name ?? ""}
            rowCount={rawRows.length}
            schema={schema}
            parseErrors={parseErrors}
            onConfirm={confirmSchema}
            onBack={reset}
          />
        )}
        {step === "generating" && (
          <GeneratingStep
            availableProviders={availableProviders}
            rowCount={rowsNeedingGeneration}
            generationProgress={generationProgress}
            generationTotal={generationTotal}
            onGenerate={handleGenerate}
            onBack={() => reset()}
          />
        )}
        {step === "evaluating" && <EvaluatingStep />}
        {step === "results" && result && (
          <ResultsStep result={result} onReset={reset} isSample={isSample} />
        )}
      </div>
    </main>
  );
}
