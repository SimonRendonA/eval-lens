import { createProvider } from "@/lib/providers";

/**
 * Streaming generation endpoint.
 *
 * Accepts rows + provider/model and streams row-level generation results as
 * Server-Sent Events (`data: {...}`) so the UI can update progress in real
 * time without polling.
 */

const KEY_MAP: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
};

export async function POST(req: Request) {
  const { rows, providerId, model } = await req.json();

  if (!rows || !providerId || !model) {
    return new Response(
      JSON.stringify({ error: "Missing rows, providerId, or model" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const useMock = process.env.USE_MOCK_GENERATION === "true";
  const total = rows.length;

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
    const envKey = KEY_MAP[providerId];
    if (!envKey) {
      return new Response(
        JSON.stringify({ error: `Unknown provider: ${providerId}` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const apiKey = process.env[envKey];
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `API key not configured for ${providerId}` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const provider = createProvider(providerId, apiKey);
    generateFn = (prompt: string) => provider.generateOutput(prompt, model);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      for (let i = 0; i < total; i++) {
        const row = rows[i];

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
          send({
            id: row.id,
            prompt: row.prompt,
            actual: `Error: ${err instanceof Error ? err.message : String(err)}`,
            error: true,
            index: i,
            total,
          });
        }

        if (!useMock && i < total - 1) {
          await new Promise((r) => setTimeout(r, 100));
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
