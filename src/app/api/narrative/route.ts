import { NextResponse } from "next/server";
import {
  createProviderFromEnv,
  getAvailableProviderById,
} from "@/lib/providers";
import { buildNarrativePrompt, parseNarrativeResponse } from "@/lib/narrative";
import type { NarrativeRequest } from "@/lib/narrative";

const VALID_PROVIDER_IDS = ["openai", "anthropic", "gemini"] as const;

export async function POST(req: Request) {
  // Self-hosted guard — must be first
  if (process.env.EVALLENS_MODE !== "self-hosted") {
    return NextResponse.json(
      { error: "Not available in hosted mode" },
      { status: 403 },
    );
  }

  let body: NarrativeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate failedRows
  if (
    !body.failedRows ||
    !Array.isArray(body.failedRows) ||
    body.failedRows.length === 0
  ) {
    return NextResponse.json(
      { error: "No failed rows to analyze" },
      { status: 400 },
    );
  }

  // Validate provider
  if (
    !body.provider ||
    !VALID_PROVIDER_IDS.includes(
      body.provider as (typeof VALID_PROVIDER_IDS)[number],
    )
  ) {
    return NextResponse.json(
      { error: "No provider selected" },
      { status: 400 },
    );
  }

  // Resolve provider config (for default model) via abstraction layer
  const providerInfo = getAvailableProviderById(process.env, body.provider);
  if (!providerInfo) {
    return NextResponse.json(
      {
        error: "Provider not configured: missing API key",
      },
      { status: 500 },
    );
  }

  const prompt = buildNarrativePrompt(body);

  // Call the provider — all key resolution is handled by the abstraction
  let rawResponse: string;
  try {
    const provider = createProviderFromEnv(body.provider, process.env);
    rawResponse = await provider.generateOutput(
      prompt,
      providerInfo.config.defaultModel,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Provider error: ${message}` },
      { status: 502 },
    );
  }

  // Parse response
  try {
    const narrative = parseNarrativeResponse(rawResponse);
    return NextResponse.json(narrative, { status: 200 });
  } catch (err) {
    console.error(
      "[narrative] Failed to parse provider response:",
      rawResponse,
    );
    if (err instanceof Error) {
      console.error("[narrative] Parse error:", err.message);
    }
    return NextResponse.json(
      { error: "Failed to parse narrative response" },
      { status: 500 },
    );
  }
}
