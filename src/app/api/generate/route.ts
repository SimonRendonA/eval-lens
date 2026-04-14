import { createProviderFromEnv, getAvailableProviderById } from "@/lib/providers";

/**
 * Streaming generation endpoint.
 *
 * Accepts rows + provider/model and streams row-level generation results as
 * Server-Sent Events (`data: {...}`) so the UI can update progress in real
 * time without polling.
 */

const VALID_PROVIDER_IDS = ["openai", "anthropic", "gemini"] as const;
type ValidProviderId = (typeof VALID_PROVIDER_IDS)[number];

/** Max rows accepted per request to prevent runaway quota usage. */
const MAX_ROWS = 500;

/**
 * Inter-row delay (ms) to avoid hitting provider rate limits.
 * Configurable via GENERATION_DELAY_MS environment variable.
 */
function getInterRowDelay(): number {
  const raw = process.env.GENERATION_DELAY_MS;
  if (!raw) return 100;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 100;
}

export async function POST(req: Request) {
  let body: { rows: unknown; providerId: unknown; model: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { rows, providerId, model } = body;

  if (!rows || !providerId || !model) {
    return new Response(
      JSON.stringify({ error: "Missing rows, providerId, or model" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!Array.isArray(rows)) {
    return new Response(
      JSON.stringify({ error: "rows must be an array" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (rows.length > MAX_ROWS) {
    return new Response(
      JSON.stringify({ error: `rows exceeds maximum of ${MAX_ROWS}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (
    typeof providerId !== "string" ||
    !VALID_PROVIDER_IDS.includes(providerId as ValidProviderId)
  ) {
    return new Response(
      JSON.stringify({ error: `Unknown provider: ${providerId}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (typeof model !== "string") {
    return new Response(
      JSON.stringify({ error: "model must be a string" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const validProviderId = providerId as ValidProviderId;

  // Validate model is in the allow-list for this provider
  const providerInfo = getAvailableProviderById(process.env, validProviderId);
  if (
    providerInfo &&
    !providerInfo.config.availableModels.includes(model)
  ) {
    return new Response(
      JSON.stringify({ error: `Unknown model '${model}' for provider '${validProviderId}'` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const useMock = process.env.USE_MOCK_GENERATION === "true";
  const total = rows.length;
  const interRowDelay = getInterRowDelay();

  let generateFn: (prompt: string) => Promise<string>;

  if (useMock) {
    generateFn = async (prompt: string) => {
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

      if (Math.random() < 0.1) {
        throw new Error("Mock rate limit exceeded");
      }

      return mockOutput(prompt);
    };
  } else {
    try {
      const provider = createProviderFromEnv(validProviderId, process.env);
      generateFn = (prompt: string) => provider.generateOutput(prompt, model);
    } catch {
      return new Response(
        JSON.stringify({ error: `API key not configured for ${validProviderId}` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      for (let i = 0; i < total; i++) {
        const row = rows[i] as { id: string; prompt: string };

        try {
          const actual = await generateFn(row.prompt);
          send({
            id: row.id,
            prompt: row.prompt,
            actual,
            index: i,
            total,
          });
        } catch (err) {
          // Send a dedicated error event so the client can surface it
          // without the error string being treated as a parseable actual value.
          send({
            id: row.id,
            prompt: row.prompt,
            actual: "",
            error: true,
            errorMessage: err instanceof Error ? err.message : String(err),
            index: i,
            total,
          });
        }

        if (!useMock && i < total - 1 && interRowDelay > 0) {
          await new Promise((r) => setTimeout(r, interRowDelay));
        }
      }

      send({ done: true });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function mockOutput(prompt: string): string {
  const nameMatch = prompt.match(/(?:from|about|:)\s*(\w+)/i);
  const name = nameMatch?.[1] ?? "Unknown";

  const roles = [
    "software engineer",
    "product manager",
    "data scientist",
    "UX designer",
    "DevOps engineer",
  ];
  const role = roles[Math.floor(Math.random() * roles.length)];

  const roll = Math.random();

  if (roll < 0.5) return JSON.stringify({ name, role });
  if (roll < 0.7) return JSON.stringify({ name: name + "x", role });
  if (roll < 0.85) return JSON.stringify({ name, role: 42 });
  return JSON.stringify({ name });
}
