type GenerateRow = {
  id: string;
  prompt: string;
};

/**
 * Client helper for consuming generation SSE events from `/api/generate`.
 *
 * Translates stream events into UI callbacks for progress, completion, and
 * terminal errors.
 */

type GenerateEvent = {
  id: string;
  prompt: string;
  actual: string;
  error?: boolean;
  errorMessage?: string;
  index: number;
  total: number;
};

type DoneEvent = {
  done: true;
};

type StreamEvent = GenerateEvent | DoneEvent;

type GenerateCallbacks = {
  /** Called for each row as it arrives from the stream. */
  onProgress: (index: number, total: number, row: GenerateEvent) => void;
  /** Called once when the stream signals completion or closes with results. */
  onComplete: (rows: GenerateEvent[]) => void;
  /** Called on HTTP errors or stream failures. Receives a human-readable message. */
  onError: (error: string) => void;
};

/**
 * Sends a generation request to `/eval-lens/api/generate` and processes the
 * Server-Sent Events (SSE) response stream.
 *
 * For each event received:
 * - Row events → `onProgress` is called and the row is accumulated
 * - Done event → `onComplete` is called with all accumulated rows
 *
 * If the stream closes without a done event:
 * - With accumulated rows → `onComplete` is called
 * - With no rows → `onError` is called
 *
 * Pass an `AbortSignal` to cancel the stream mid-flight (e.g. on unmount or reset).
 */
export async function generateWithStream(
  rows: GenerateRow[],
  providerId: string,
  model: string,
  callbacks: GenerateCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/eval-lens/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows, providerId, model }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json();
    callbacks.onError(err.error || "Generation request failed");
    return;
  }

  if (!response.body) {
    callbacks.onError("No response stream");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const completedRows: GenerateEvent[] = [];
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const json = line.slice(6);

        try {
          const event: StreamEvent = JSON.parse(json);

          if ("done" in event) {
            callbacks.onComplete(completedRows);
            return;
          }

          completedRows.push(event);
          callbacks.onProgress(event.index, event.total, event);
        } catch {
          // Skip malformed events
        }
      }
    }
  } catch (err) {
    // Swallow AbortError — the caller intentionally cancelled the stream
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }
    throw err;
  } finally {
    reader.releaseLock();
  }

  // Stream ended without done event
  if (completedRows.length > 0) {
    callbacks.onComplete(completedRows);
  } else {
    callbacks.onError("Stream ended without results");
  }
}
