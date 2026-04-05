import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateWithStream } from "./generate-stream";

// Helpers to build ReadableStream from SSE lines
function sseStream(events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event));
      }
      controller.close();
    },
  });
}

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

const rows = [
  { id: "1", prompt: "What is the name?" },
  { id: "2", prompt: "What is the age?" },
];

describe("generateWithStream", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("happy path", () => {
    it("calls onComplete with all received rows when done event arrives", async () => {
      const completedRows = [
        { id: "1", prompt: "p1", actual: '{"name":"Alice"}', index: 0, total: 2 },
        { id: "2", prompt: "p2", actual: '{"age":30}', index: 1, total: 2 },
      ];
      const streamEvents = [
        ...completedRows.map(sseEvent),
        sseEvent({ done: true }),
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        body: sseStream(streamEvents),
      } as Response);

      const onComplete = vi.fn();
      const onProgress = vi.fn();
      const onError = vi.fn();

      await generateWithStream(rows, "openai", "gpt-4", { onProgress, onComplete, onError });

      expect(onError).not.toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledOnce();
      expect(onComplete).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: "1" }),
        expect.objectContaining({ id: "2" }),
      ]));
    });

    it("calls onProgress for each row event", async () => {
      const streamEvents = [
        sseEvent({ id: "1", prompt: "p", actual: '{"a":1}', index: 0, total: 1 }),
        sseEvent({ done: true }),
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        body: sseStream(streamEvents),
      } as Response);

      const onProgress = vi.fn();

      await generateWithStream(rows, "anthropic", "claude-sonnet-4-6", {
        onProgress,
        onComplete: vi.fn(),
        onError: vi.fn(),
      });

      expect(onProgress).toHaveBeenCalledOnce();
      expect(onProgress).toHaveBeenCalledWith(0, 1, expect.objectContaining({ id: "1" }));
    });

    it("sends correct request body to the generate endpoint", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        body: sseStream([sseEvent({ done: true })]),
      } as Response);

      await generateWithStream(rows, "openai", "gpt-4", {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      });

      expect(fetch).toHaveBeenCalledWith(
        "/eval-lens/api/generate",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows, providerId: "openai", model: "gpt-4" }),
        }),
      );
    });
  });

  describe("error handling", () => {
    it("calls onError when the HTTP response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      } as Response);

      const onError = vi.fn();

      await generateWithStream(rows, "openai", "gpt-4", {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError,
      });

      expect(onError).toHaveBeenCalledWith("Unauthorized");
    });

    it("calls onError with fallback message when error body has no error field", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      } as Response);

      const onError = vi.fn();

      await generateWithStream(rows, "openai", "gpt-4", {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError,
      });

      expect(onError).toHaveBeenCalledWith("Generation request failed");
    });

    it("calls onError when response has no body", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        body: null,
      } as Response);

      const onError = vi.fn();

      await generateWithStream(rows, "openai", "gpt-4", {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError,
      });

      expect(onError).toHaveBeenCalledWith("No response stream");
    });

    it("calls onError when stream ends without a done event and no rows collected", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        body: sseStream([]),
      } as Response);

      const onError = vi.fn();

      await generateWithStream(rows, "openai", "gpt-4", {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError,
      });

      expect(onError).toHaveBeenCalledWith("Stream ended without results");
    });

    it("calls onComplete (not onError) when stream ends without done event but rows were collected", async () => {
      const streamEvents = [
        sseEvent({ id: "1", prompt: "p", actual: '{"a":1}', index: 0, total: 1 }),
        // no done event
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        body: sseStream(streamEvents),
      } as Response);

      const onComplete = vi.fn();
      const onError = vi.fn();

      await generateWithStream(rows, "openai", "gpt-4", {
        onProgress: vi.fn(),
        onComplete,
        onError,
      });

      expect(onError).not.toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: "1" }),
      ]));
    });
  });

  describe("SSE parsing", () => {
    it("skips non-data lines in the stream", async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(
            `event: progress\n` +
            `data: ${JSON.stringify({ id: "1", prompt: "p", actual: '{"a":1}', index: 0, total: 1 })}\n\n` +
            `data: ${JSON.stringify({ done: true })}\n\n`
          ));
          controller.close();
        },
      });

      vi.mocked(fetch).mockResolvedValue({ ok: true, body: stream } as Response);

      const onComplete = vi.fn();

      await generateWithStream(rows, "openai", "gpt-4", {
        onProgress: vi.fn(),
        onComplete,
        onError: vi.fn(),
      });

      expect(onComplete).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "1" })]),
      );
    });

    it("skips malformed data lines without throwing", async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(
            `data: not-json\n` +
            `data: ${JSON.stringify({ done: true })}\n\n`
          ));
          controller.close();
        },
      });

      vi.mocked(fetch).mockResolvedValue({ ok: true, body: stream } as Response);

      const onComplete = vi.fn();

      await generateWithStream(rows, "openai", "gpt-4", {
        onProgress: vi.fn(),
        onComplete,
        onError: vi.fn(),
      });

      // done event was parsed, so onComplete fires with empty array
      expect(onComplete).toHaveBeenCalledWith([]);
    });
  });
});
