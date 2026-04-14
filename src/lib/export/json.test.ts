import { describe, it, expect } from "vitest";
import { exportToJson } from "./json";
import type { EvaluationResult, ExportMeta } from "../types";

const sampleResult: EvaluationResult = {
  summary: {
    total: 2,
    passed: 1,
    failed: 1,
    passRate: 0.5,
    failureReasons: {
      SCHEMA_MISMATCH: 0,
      MISSING_FIELD: 0,
      WRONG_TYPE: 0,
      WRONG_VALUE: 1,
      EXTRA_FIELD: 0,
      UNPARSEABLE: 0,
    },
  },
  rowResults: [
    { id: "1", status: "pass", failures: [] },
    {
      id: "2",
      status: "fail",
      failures: [{ reason: "WRONG_VALUE", field: "name", expected: "Alice", actual: "Bob" }],
    },
  ],
};

describe("exportToJson", () => {
  it("returns valid JSON", () => {
    const output = exportToJson(sampleResult);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("round-trips the evaluation result losslessly", () => {
    const output = exportToJson(sampleResult);
    const parsed = JSON.parse(output);
    expect(parsed.summary).toEqual(sampleResult.summary);
    expect(parsed.rowResults).toEqual(sampleResult.rowResults);
  });

  it("produces pretty-printed output (2-space indentation)", () => {
    const output = exportToJson(sampleResult);
    expect(output).toContain("\n  ");
  });

  it("includes summary and rowResults at the top level", () => {
    const parsed = JSON.parse(exportToJson(sampleResult));
    expect(parsed).toHaveProperty("summary");
    expect(parsed).toHaveProperty("rowResults");
  });

  it("includes hosted meta by default", () => {
    const parsed = JSON.parse(exportToJson(sampleResult));
    expect(parsed.meta.mode).toBe("hosted");
    expect(parsed.meta.outputSource).toBe("uploaded");
  });

  it("includes self-hosted provider metadata and narrative when present", () => {
    const meta: ExportMeta = {
      mode: "self-hosted",
      fileName: "selfhosted-stress-50.csv",
      outputSource: "generated",
      generatedRowCount: 8,
      provider: "openai",
      model: "gpt-5-mini",
      narrative: {
        summary: "The model is failing on field-level value checks.",
        patterns: [
          {
            title: "Wrong labels",
            description: "Classification labels drift away from the expected taxonomy.",
            affectedCount: 4,
            exampleIds: ["2"],
          },
        ],
        recommendation: "Tighten the label schema in the prompt.",
      },
    };

    const parsed = JSON.parse(exportToJson(sampleResult, meta));
    expect(parsed.meta.mode).toBe("self-hosted");
    expect(parsed.meta.outputSource).toBe("provider-generated");
    expect(parsed.meta.provider).toBe("openai");
    expect(parsed.meta.generatedRowCount).toBe(8);
    expect(parsed.failureAnalysis.summary).toContain("field-level value checks");
  });
});
