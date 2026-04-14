"use client";

import Image from "next/image";
import { Search, ShieldCheck, Upload } from "lucide-react";
import useEvaluation from "./hooks/useEvaluation";
import { Button } from "@/components/ui/button";
import type { ExportMeta } from "@/lib/types";
import { UploadStep } from "./components/upload-step";
import { SchemaStep } from "./components/schema-step";
import { GeneratingStep } from "./components/generating-step";
import { EvaluatingStep } from "./components/evaluating-step";
import { ResultsStep } from "./components/results-step";

/**
 * Main application page.
 *
 * Renders the landing/marketing content for the upload step and switches to
 * workflow-specific step components based on `useEvaluation` state.
 */

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
    selectedProvider,
    selectedModel,
    generatedRowCount,
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
  } = useEvaluation();

  const rowsNeedingGeneration = rawRows.filter(
    (r) => !r.actual || r.actual === "",
  ).length;

  const exportMeta: ExportMeta | undefined = result
    ? {
        mode,
        fileName: file?.name,
        isSample,
        outputSource: generatedRowCount > 0 ? "generated" : "uploaded",
        generatedRowCount,
        provider: mode === "self-hosted" ? selectedProvider ?? undefined : undefined,
        model: mode === "self-hosted" ? selectedModel ?? undefined : undefined,
        narrative: narrativeStatus === "success" ? narrative ?? undefined : undefined,
      }
    : undefined;

  const scrollToUpload = () => {
    const uploadSection = document.getElementById("upload-section");
    uploadSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const stepCards = [
    {
      step: "01",
      title: "Upload",
      description:
        "Bring your CSV or JSONL with id, prompt, expected, and actual.",
      Icon: Upload,
    },
    {
      step: "02",
      title: "Evaluate",
      description:
        "Score pass rate and classify schema, type, and value failures.",
      Icon: ShieldCheck,
    },
    {
      step: "03",
      title: "Inspect",
      description: "Filter row-level failures and diagnose regressions quickly.",
      Icon: Search,
    },
  ];

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
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-brand to-brand-accent text-black hover:opacity-90"
            >
              <a
                href="https://rendonarango.com"
                target="_blank"
                rel="noreferrer"
              >
                Built by Simon Rendon Arango
              </a>
            </Button>
            {step !== "upload" && (
              <Button variant="ghost" size="sm" onClick={reset}>
                ← New evaluation
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        {step === "upload" && (
          <div className="space-y-16">
            <section className="landing-reveal relative overflow-hidden rounded-2xl border border-border bg-surface/70 p-8 sm:p-10">
              <div className="pointer-events-none absolute -top-24 -left-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
              <div className="pointer-events-none absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-brand-accent/15 blur-3xl" />

              <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div className="flex flex-col gap-7">
                  <div className="flex flex-wrap items-center gap-3">
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
                    <a
                      href="https://github.com/SimonRendonA/eval-lens"
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-border bg-elevated px-3 py-1 text-xs font-medium text-muted-foreground transition hover:border-brand/40 hover:text-brand"
                    >
                      Open source on GitHub
                    </a>
                  </div>

                  <div className="space-y-4">
                    <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
                      Catch schema drift before production.
                    </h1>
                    <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                      Evaluate LLM structured outputs, pinpoint failure reasons
                      in seconds, and run the same workflow in hosted or fully
                      private self-hosted mode.
                    </p>
                    <p className="text-sm text-text-secondary">
                      Built for prompt engineers, eval teams, and AI product
                      developers.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={scrollToUpload}
                      className="bg-gradient-to-r from-brand to-brand-accent text-black hover:opacity-90"
                      size="lg"
                    >
                      Start evaluating
                    </Button>
                    <Button
                      onClick={scrollToUpload}
                      variant="outline"
                      size="lg"
                      className="border-brand/40"
                    >
                      Try sample dataset
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                    {[
                      "Regression evals",
                      "Extraction QA",
                      "Classification audits",
                      "Docker deployable",
                    ].map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border bg-elevated px-2.5 py-1"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <aside className="landing-reveal rounded-2xl border border-border bg-elevated/80 p-4 shadow-[0_0_0_1px_rgba(0,212,170,0.08)]" style={{ animationDelay: "120ms" }}>
                  <p className="text-xs uppercase tracking-wide text-brand">
                    Live evaluation snapshot
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface p-2">
                      <p className="text-xs text-muted-foreground">Pass rate</p>
                      <p className="text-lg font-semibold">86%</p>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <p className="text-xs text-muted-foreground">Rows</p>
                      <p className="text-lg font-semibold">1,024</p>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <p className="text-xs text-muted-foreground">Failures</p>
                      <p className="text-lg font-semibold text-fail">143</p>
                    </div>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-lg border border-border">
                    <div className="grid grid-cols-[1fr_auto] bg-surface px-3 py-2 text-xs text-muted-foreground">
                      <span>WRONG_TYPE</span>
                      <span>64</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] border-t border-border px-3 py-2 text-xs">
                      <span>MISSING_FIELD</span>
                      <span>47</span>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] border-t border-border px-3 py-2 text-xs">
                      <span>WRONG_VALUE</span>
                      <span>32</span>
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            <section className="landing-reveal space-y-4" style={{ animationDelay: "80ms" }}>
              <h2 className="text-2xl font-bold">How it works</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {stepCards.map((item, index) => (
                  <article
                    key={item.title}
                    className="landing-reveal rounded-xl border border-border bg-surface p-4 transition hover:border-brand/40 hover:bg-surface/90"
                    style={{ animationDelay: `${140 + index * 60}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium tracking-wide text-brand">
                        {item.step}
                      </p>
                      <item.Icon className="h-4 w-4 text-brand" />
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="landing-reveal space-y-4" style={{ animationDelay: "120ms" }}>
              <h2 className="text-2xl font-bold">Deploy anywhere</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="relative overflow-hidden rounded-xl border border-border bg-surface p-5">
                  <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-brand/15 blur-2xl" />
                  <p className="text-xs font-medium tracking-wide text-brand">HOSTED</p>
                  <h3 className="mt-2 text-lg font-semibold">Use instantly</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Open the hosted app and start evaluating in seconds with no infrastructure setup.
                  </p>
                </article>

                <article className="relative overflow-hidden rounded-xl border border-border bg-surface p-5">
                  <div className="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-brand-accent/15 blur-2xl" />
                  <p className="text-xs font-medium tracking-wide text-brand-accent">SELF-HOSTED</p>
                  <h3 className="mt-2 text-lg font-semibold">Docker deployable in minutes</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Run EvalLens in your own environment for private datasets and controlled provider keys.
                  </p>
                  <div className="mt-3 rounded-lg border border-border bg-elevated px-3 py-2 font-mono text-xs text-text-secondary">
                    docker run -p 3000:3000 -e EVALLENS_MODE=self-hosted evallens
                  </div>
                </article>
              </div>
            </section>

            <section className="landing-reveal space-y-4" style={{ animationDelay: "160ms" }}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold">Hosted vs self-hosted</h2>
                <span className="rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
                  Current mode: {mode === "hosted" ? "Hosted" : "Self-hosted"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-border bg-surface p-5 transition hover:border-brand/40 hover:bg-surface/90">
                  <p className="text-xs font-medium tracking-wide text-brand">
                    HOSTED
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    Bring your completed outputs
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <li>Use when you already have model outputs.</li>
                    <li>Requires <span className="font-mono">expected</span> and <span className="font-mono">actual</span> in your file.</li>
                    <li>Fastest path for regression checks and release gates.</li>
                  </ul>
                </article>

                <article className="rounded-xl border border-border bg-surface p-5 transition hover:border-brand/40 hover:bg-surface/90">
                  <p className="text-xs font-medium tracking-wide text-brand-accent">
                    SELF-HOSTED
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">
                    Generate, then evaluate in one run
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <li>Generates missing <span className="font-mono">actual</span> outputs before scoring.</li>
                    <li>Bring your own OpenAI, Anthropic, or Gemini key.</li>
                    <li>Deploy with Docker quickly for local or server environments.</li>
                    <li>Deterministic eval workflow for local, staging, or CI.</li>
                  </ul>
                  <p className="mt-3 rounded-lg border border-brand/20 bg-brand/10 px-3 py-2 text-xs text-brand">
                    Your data stays in your environment.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" className="border-brand/40 hover:bg-brand/10">
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

            <section id="upload-section" className="landing-reveal" style={{ animationDelay: "200ms" }}>
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
          <ResultsStep
            result={result}
            onReset={reset}
            exportMeta={exportMeta}
            isSample={isSample}
            mode={mode}
            narrativeStatus={narrativeStatus}
            narrative={narrative}
            narrativeError={narrativeError}
            onTriggerNarrative={triggerNarrative}
          />
        )}
      </div>
    </main>
  );
}
