import { describe, it, expect } from "vitest";
import {
  buildNarrativePrompt,
  parseNarrativeResponse,
  NarrativeParseError,
} from "./generator";
import type { NarrativeRequest, NarrativeRow, NarrativeResponse } from "./types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRow(
  id: string,
  reasons: string[],
  opts: Partial<NarrativeRow> = {},
): NarrativeRow {
  return {
    id,
    expected: '{"name":"Alice"}',
    actual: '{"name":"Bob"}',
    failureReasons: reasons,
    ...opts,
  };
}

function makeRequest(
  rows: NarrativeRow[],
  opts: Partial<NarrativeRequest> = {},
): NarrativeRequest {
  return {
    failedRows: rows,
    totalRows: rows.length + 5,
    failedCount: rows.length,
    passedCount: 5,
    failureBreakdown: { WRONG_VALUE: rows.length },
    provider: "openai",
    ...opts,
  };
}

function validNarrativeJson(overrides: Partial<NarrativeResponse> = {}): string {
  const base: NarrativeResponse = {
    summary: "Most failures are value mismatches.",
    patterns: [
      {
        title: "Value mismatch",
        description: "Expected values do not match actuals.",
        affectedCount: 3,
        exampleIds: ["1", "2"],
      },
    ],
    recommendation: "Review the prompt template.",
    ...overrides,
  };
  return JSON.stringify(base);
}

// ─── buildNarrativePrompt ──────────────────────────────────────────────────

describe("buildNarrativePrompt", () => {
  it("includes evaluation context counts", () => {
    const rows = [makeRow("1", ["WRONG_VALUE"]), makeRow("2", ["MISSING_FIELD"])];
    const request = makeRequest(rows, {
      totalRows: 10,
      failedCount: 2,
      passedCount: 8,
    });
    const prompt = buildNarrativePrompt(request);
    expect(prompt).toContain("Total rows: 10");
    expect(prompt).toContain("Failed rows: 2");
    expect(prompt).toContain("Passed rows: 8");
  });

  it("includes failure breakdown entries", () => {
    const rows = [makeRow("1", ["WRONG_VALUE"])];
    const request = makeRequest(rows, {
      failureBreakdown: { WRONG_VALUE: 5, MISSING_FIELD: 2 },
    });
    const prompt = buildNarrativePrompt(request);
    expect(prompt).toContain("MISSING_FIELD: 2");
    expect(prompt).toContain("WRONG_VALUE: 5");
  });

  it("includes prompt field when ≥ 80% of rows have a non-empty prompt", () => {
    const rows = [
      makeRow("1", ["WRONG_VALUE"], { prompt: "What is the name?" }),
      makeRow("2", ["WRONG_VALUE"], { prompt: "Describe the role." }),
    ];
    const prompt = buildNarrativePrompt(makeRequest(rows));
    expect(prompt).toContain("What is the name?");
    expect(prompt).toContain("Describe the role.");
  });

  it("omits prompt field when fewer than 80% of rows have a prompt", () => {
    const rows = [
      makeRow("1", ["WRONG_VALUE"], { prompt: "Has a prompt" }),
      makeRow("2", ["WRONG_VALUE"]),
      makeRow("3", ["WRONG_VALUE"]),
      makeRow("4", ["WRONG_VALUE"]),
      makeRow("5", ["WRONG_VALUE"]),
    ];
    const prompt = buildNarrativePrompt(makeRequest(rows));
    expect(prompt).not.toContain("Has a prompt");
  });

  it("caps sampled rows at 20 when more than 20 failed rows are given", () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      makeRow(String(i + 1), ["WRONG_VALUE"]),
    );
    const prompt = buildNarrativePrompt(makeRequest(rows));
    // Header says "20 of 30 shown"
    expect(prompt).toContain("20 of 30 shown");
  });

  it("shows all rows when fewer than 20 are given", () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow(String(i + 1), ["WRONG_VALUE"]),
    );
    const prompt = buildNarrativePrompt(makeRequest(rows));
    expect(prompt).toContain("5 of 5 shown");
  });

  it("includes fieldFailures in row block when present", () => {
    const rows = [
      makeRow("1", ["WRONG_VALUE"], { fieldFailures: { name: "WRONG_VALUE" } }),
    ];
    const prompt = buildNarrativePrompt(makeRequest(rows));
    expect(prompt).toContain("fieldFailures:");
    expect(prompt).toContain("name: WRONG_VALUE");
  });
});

// ─── parseNarrativeResponse ────────────────────────────────────────────────

describe("parseNarrativeResponse", () => {
  it("parses a valid JSON response", () => {
    const result = parseNarrativeResponse(validNarrativeJson());
    expect(result.summary).toBe("Most failures are value mismatches.");
    expect(result.patterns).toHaveLength(1);
    expect(result.patterns[0].title).toBe("Value mismatch");
    expect(result.recommendation).toBe("Review the prompt template.");
  });

  it("strips leading markdown fences before parsing", () => {
    const fenced = "```json\n" + validNarrativeJson() + "\n```";
    const result = parseNarrativeResponse(fenced);
    expect(result.summary).toBeDefined();
  });

  it("strips plain code fences before parsing", () => {
    const fenced = "```\n" + validNarrativeJson() + "\n```";
    const result = parseNarrativeResponse(fenced);
    expect(result.summary).toBeDefined();
  });

  it("throws NarrativeParseError for invalid JSON", () => {
    expect(() => parseNarrativeResponse("not json")).toThrowError(
      NarrativeParseError,
    );
  });

  it("throws NarrativeParseError when summary is missing", () => {
    const bad = JSON.stringify({ patterns: [], recommendation: "Fix it." });
    expect(() => parseNarrativeResponse(bad)).toThrowError(NarrativeParseError);
  });

  it("throws NarrativeParseError when patterns is missing", () => {
    const bad = JSON.stringify({
      summary: "ok",
      recommendation: "Fix it.",
    });
    expect(() => parseNarrativeResponse(bad)).toThrowError(NarrativeParseError);
  });

  it("throws NarrativeParseError when recommendation is missing", () => {
    const bad = JSON.stringify({ summary: "ok", patterns: [] });
    expect(() => parseNarrativeResponse(bad)).toThrowError(NarrativeParseError);
  });

  it("throws NarrativeParseError when a pattern is malformed", () => {
    const bad = JSON.stringify({
      summary: "ok",
      recommendation: "fix",
      patterns: [{ title: "bad" /* missing required fields */ }],
    });
    expect(() => parseNarrativeResponse(bad)).toThrowError(NarrativeParseError);
  });

  it("preserves rawResponse on NarrativeParseError", () => {
    const raw = "not json at all";
    try {
      parseNarrativeResponse(raw);
    } catch (err) {
      expect(err).toBeInstanceOf(NarrativeParseError);
      expect((err as NarrativeParseError).rawResponse).toBe(raw);
    }
  });

  it("accepts an empty patterns array", () => {
    const json = JSON.stringify({
      summary: "No patterns found.",
      patterns: [],
      recommendation: "Review manually.",
    });
    const result = parseNarrativeResponse(json);
    expect(result.patterns).toHaveLength(0);
  });
});
