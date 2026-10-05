import { describe, it, expect, afterEach } from "vitest";
import { POST } from "./route";

const originalMode = process.env.EVALLENS_MODE;

function request(body: unknown): Request {
  return new Request("http://localhost/eval-lens/api/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate", () => {
  afterEach(() => {
    process.env.EVALLENS_MODE = originalMode;
  });

  it("rejects requests in hosted mode before touching any provider", async () => {
    process.env.EVALLENS_MODE = "hosted";
    const res = await POST(
      request({ rows: [{ id: "1", prompt: "p" }], providerId: "openai", model: "gpt-5.4-mini" }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Not available in hosted mode" });
  });

  it("rejects requests when the mode is unset", async () => {
    delete process.env.EVALLENS_MODE;
    const res = await POST(request({}));
    expect(res.status).toBe(403);
  });

  it("validates the body in self-hosted mode", async () => {
    process.env.EVALLENS_MODE = "self-hosted";
    const res = await POST(request({}));
    expect(res.status).toBe(400);
  });
});
