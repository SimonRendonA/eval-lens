

export async function POST(req: Request) {
  const { rows, providerId, model } = await req.json();

  if (!rows || !providerId || !model) {
    return new Response(
      JSON.stringify({ error: "Missing rows, providerId, or model" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const total = rows.length;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      for (let i = 0; i < total; i++) {
        const row = rows[i];

        // Simulate API latency (200-500ms per row)
        await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

        // ~10% chance of simulated error
        if (Math.random() < 0.1) {
          send({
            id: row.id,
            prompt: row.prompt,
            actual: "Error: Mock rate limit exceeded",
            error: true,
            index: i,
            total,
          });
        } else {
          // Generate a plausible fake response based on the prompt
          const mockOutput = generateMockOutput(row.prompt);
          send({
            id: row.id,
            prompt: row.prompt,
            actual: mockOutput,
            index: i,
            total,
          });
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

function generateMockOutput(prompt: string): string {
  // Try to extract name from prompt for realistic mock data
  const nameMatch = prompt.match(/(?:from|about|:)\s*(\w+)/i);
  const name = nameMatch?.[1] ?? "Unknown";

  const roles = [
    "software engineer",
    "product manager",
    "data scientist",
    "UX designer",
    "DevOps engineer",
    "frontend developer",
    "backend developer",
  ];
  const role = roles[Math.floor(Math.random() * roles.length)];

  // Sometimes return correct-ish output, sometimes introduce errors
  const roll = Math.random();

  if (roll < 0.5) {
    // Correct output
    return JSON.stringify({ name, role });
  } else if (roll < 0.7) {
    // Wrong value
    return JSON.stringify({ name: name + "x", role });
  } else if (roll < 0.85) {
    // Wrong type
    return JSON.stringify({ name, role: 42 });
  } else {
    // Missing field
    return JSON.stringify({ name });
  }
}
