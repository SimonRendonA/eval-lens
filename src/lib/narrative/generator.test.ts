import { describe, it, expect } from "vitest";
import {
  buildNarrativePrompt,
  clusterFailures,
  parseNarrativeResponse,
  NarrativeParseError,
} from "./generator";
import type { FailureCluster, NarrativeRequest, NarrativeRow } from "./types";

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
    failures: reasons.map((reason) => ({ field: "name", reason })),
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

const clusters: FailureCluster[] = [
  { id: "C1", field: "company", reason: "WRONG_VALUE", rowIds: ["1", "2", "3", "4"] },
  { id: "C2", field: "city", reason: "WRONG_VALUE", rowIds: ["4", "5"] },
];

function validNarrativeJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    summary: "Most failures are value mismatches.",
    patterns: [
      {
        title: "Value mismatch",
        description: "Expected values do not match actuals.",
        clusterIds: ["C1"],
      },
    ],
    recommendation: "Review the prompt template.",
    ...overrides,
  });
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

  it("lists each row's failures and cluster ids", () => {
    const rows = [makeRow("1", ["WRONG_VALUE"])];
    const prompt = buildNarrativePrompt(makeRequest(rows));
    expect(prompt).toContain("failures: name WRONG_VALUE");
    expect(prompt).toContain("clusters: C1");
  });

  it("lists exact clusters computed over every failed row", () => {
    const rows = [
      makeRow("1", ["WRONG_VALUE"]),
      makeRow("2", ["WRONG_VALUE"]),
      makeRow("3", ["MISSING_FIELD"]),
    ];
    const prompt = buildNarrativePrompt(makeRequest(rows));
    expect(prompt).toContain('- C1: field "name", WRONG_VALUE, 2 rows');
    expect(prompt).toContain('- C2: field "name", MISSING_FIELD, 1 rows');
  });

  it("samples small clusters even when one cluster dominates", () => {
    const rows = [
      ...Array.from({ length: 40 }, (_, i) => makeRow(`big-${i}`, ["WRONG_VALUE"])),
      makeRow("rare", ["EXTRA_FIELD"]),
    ];
    const prompt = buildNarrativePrompt(makeRequest(rows));
    expect(prompt).toContain("id: rare");
  });
});

// ─── parseNarrativeResponse ────────────────────────────────────────────────

describe("parseNarrativeResponse", () => {
  it("parses a valid JSON response", () => {
    const result = parseNarrativeResponse(validNarrativeJson(), clusters);
    expect(result.summary).toBe("Most failures are value mismatches.");
    expect(result.patterns).toHaveLength(1);
    expect(result.patterns[0].title).toBe("Value mismatch");
    expect(result.recommendation).toBe("Review the prompt template.");
  });

  it("strips leading markdown fences before parsing", () => {
    const fenced = "```json\n" + validNarrativeJson() + "\n```";
    const result = parseNarrativeResponse(fenced, clusters);
    expect(result.summary).toBeDefined();
  });

  it("strips plain code fences before parsing", () => {
    const fenced = "```\n" + validNarrativeJson() + "\n```";
    const result = parseNarrativeResponse(fenced, clusters);
    expect(result.summary).toBeDefined();
  });

  it("throws NarrativeParseError for invalid JSON", () => {
    expect(() => parseNarrativeResponse("not json", clusters)).toThrowError(
      NarrativeParseError,
    );
  });

  it("throws NarrativeParseError when summary is missing", () => {
    const bad = JSON.stringify({ patterns: [], recommendation: "Fix it." });
    expect(() => parseNarrativeResponse(bad, clusters)).toThrowError(NarrativeParseError);
  });

  it("throws NarrativeParseError when patterns is missing", () => {
    const bad = JSON.stringify({
      summary: "ok",
      recommendation: "Fix it.",
    });
    expect(() => parseNarrativeResponse(bad, clusters)).toThrowError(NarrativeParseError);
  });

  it("throws NarrativeParseError when recommendation is missing", () => {
    const bad = JSON.stringify({ summary: "ok", patterns: [] });
    expect(() => parseNarrativeResponse(bad, clusters)).toThrowError(NarrativeParseError);
  });

  it("throws NarrativeParseError when a pattern is malformed", () => {
    const bad = JSON.stringify({
      summary: "ok",
      recommendation: "fix",
      patterns: [{ title: "bad" /* missing required fields */ }],
    });
    expect(() => parseNarrativeResponse(bad, clusters)).toThrowError(NarrativeParseError);
  });

  it("preserves rawResponse on NarrativeParseError", () => {
    const raw = "not json at all";
    try {
      parseNarrativeResponse(raw, clusters);
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
    const result = parseNarrativeResponse(json, clusters);
    expect(result.patterns).toHaveLength(0);
  });

  it("computes affectedCount and exampleIds from the cited clusters", () => {
    const json = validNarrativeJson({
      patterns: [{ title: "Both", description: "d", clusterIds: ["C1", "C2"] }],
    });
    const [pattern] = parseNarrativeResponse(json, clusters).patterns;
    // Rows 1-4 and 4-5 overlap on row 4: five distinct rows
    expect(pattern.affectedCount).toBe(5);
    expect(pattern.exampleIds).toEqual(["1", "2", "3"]);
    expect(pattern.basis).toEqual([
      { field: "company", reason: "WRONG_VALUE", count: 4 },
      { field: "city", reason: "WRONG_VALUE", count: 2 },
    ]);
  });

  it("ignores counts and ids the model makes up", () => {
    const json = validNarrativeJson({
      patterns: [
        {
          title: "Inflated",
          description: "d",
          clusterIds: ["C2"],
          affectedCount: 500,
          exampleIds: ["999"],
        },
      ],
    });
    const [pattern] = parseNarrativeResponse(json, clusters).patterns;
    expect(pattern.affectedCount).toBe(2);
    expect(pattern.exampleIds).toEqual(["4", "5"]);
  });

  it("drops patterns that cite no known cluster and counts them", () => {
    const json = validNarrativeJson({
      patterns: [
        { title: "Real", description: "d", clusterIds: ["C1"] },
        { title: "Invented", description: "d", clusterIds: ["C99"] },
      ],
    });
    const result = parseNarrativeResponse(json, clusters);
    expect(result.patterns.map((p) => p.title)).toEqual(["Real"]);
    expect(result.discardedPatterns).toBe(1);
  });

  it("recovers JSON the model wrapped in prose", () => {
    const result = parseNarrativeResponse(
      `Here is my analysis: ${validNarrativeJson()}`,
      clusters,
    );
    expect(result.patterns).toHaveLength(1);
  });
});

describe("clusterFailures", () => {
  it("groups rows by field and reason, largest cluster first", () => {
    const rows: NarrativeRow[] = [
      { id: "a", expected: "", actual: "", failures: [{ field: "x", reason: "WRONG_VALUE" }] },
      {
        id: "b",
        expected: "",
        actual: "",
        failures: [
          { field: "y", reason: "MISSING_FIELD" },
          { field: "x", reason: "WRONG_VALUE" },
        ],
      },
    ];
    expect(clusterFailures(rows)).toEqual([
      { id: "C1", field: "x", reason: "WRONG_VALUE", rowIds: ["a", "b"] },
      { id: "C2", field: "y", reason: "MISSING_FIELD", rowIds: ["b"] },
    ]);
  });

  it("counts a row once per cluster", () => {
    const rows: NarrativeRow[] = [
      {
        id: "a",
        expected: "",
        actual: "",
        failures: [
          { field: "_root", reason: "WRONG_TYPE" },
          { field: "_root", reason: "WRONG_TYPE" },
        ],
      },
    ];
    expect(clusterFailures(rows)[0].rowIds).toEqual(["a"]);
  });
});
