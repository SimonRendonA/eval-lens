import { describe, it, expect } from "vitest";
import { exportToJson } from "./json";
import type { EvaluationResult } from "../types";

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
    expect(JSON.parse(output)).toEqual(sampleResult);
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
});
