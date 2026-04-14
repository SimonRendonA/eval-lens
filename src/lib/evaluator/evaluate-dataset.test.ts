import { describe, it, expect } from "vitest";
import { evaluateDataset } from "./evaluate-dataset";
import type { RawDatasetRow, InferredSchema } from "../types";

function makeRow(id: string, expected: unknown, actual: unknown): RawDatasetRow {
  return {
    id,
    prompt: "test prompt",
    expected: JSON.stringify(expected),
    actual: JSON.stringify(actual),
  };
}

const schema: InferredSchema = {
  fields: [{ name: "name", type: "string", required: true }],
};

describe("evaluateDataset", () => {
  describe("summary statistics", () => {
    it("returns 100% pass rate when all rows pass", () => {
      const rows = [
        makeRow("1", { name: "Alice" }, { name: "Alice" }),
        makeRow("2", { name: "Bob" }, { name: "Bob" }),
      ];
      const { summary } = evaluateDataset(rows, schema);
      expect(summary.total).toBe(2);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(0);
      expect(summary.passRate).toBe(1);
    });

    it("returns 0% pass rate when all rows fail", () => {
      const rows = [
        makeRow("1", { name: "Alice" }, { name: "Wrong" }),
        makeRow("2", { name: "Bob" }, { name: "Wrong" }),
      ];
      const { summary } = evaluateDataset(rows, schema);
      expect(summary.total).toBe(2);
      expect(summary.passed).toBe(0);
      expect(summary.failed).toBe(2);
      expect(summary.passRate).toBe(0);
    });

    it("computes correct pass rate for mixed results", () => {
      const rows = [
        makeRow("1", { name: "Alice" }, { name: "Alice" }), // pass
        makeRow("2", { name: "Bob" }, { name: "Wrong" }),   // fail
        makeRow("3", { name: "Charlie" }, { name: "Wrong" }), // fail
        makeRow("4", { name: "Dave" }, { name: "Dave" }),   // pass
      ];
      const { summary } = evaluateDataset(rows, schema);
      expect(summary.total).toBe(4);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(2);
      expect(summary.passRate).toBe(0.5);
    });

    it("returns 0 pass rate for empty dataset", () => {
      const { summary } = evaluateDataset([], schema);
      expect(summary.total).toBe(0);
      expect(summary.passRate).toBe(0);
    });
  });

  describe("failure reason counts", () => {
    it("initializes all failure reasons to 0", () => {
      const rows = [makeRow("1", { name: "Alice" }, { name: "Alice" })];
      const { summary } = evaluateDataset(rows, schema);
      expect(summary.failureReasons.MISSING_FIELD).toBe(0);
      expect(summary.failureReasons.WRONG_TYPE).toBe(0);
      expect(summary.failureReasons.WRONG_VALUE).toBe(0);
      expect(summary.failureReasons.EXTRA_FIELD).toBe(0);
      expect(summary.failureReasons.UNPARSEABLE).toBe(0);
    });

    it("counts WRONG_VALUE failures", () => {
      const rows = [
        makeRow("1", { name: "Alice" }, { name: "Wrong" }),
        makeRow("2", { name: "Bob" }, { name: "Wrong" }),
      ];
      const { summary } = evaluateDataset(rows, schema);
      expect(summary.failureReasons.WRONG_VALUE).toBe(2);
    });

    it("counts MISSING_FIELD failures", () => {
      const rows = [
        makeRow("1", { name: "Alice" }, {}),
        makeRow("2", { name: "Bob" }, {}),
      ];
      const { summary } = evaluateDataset(rows, schema);
      expect(summary.failureReasons.MISSING_FIELD).toBe(2);
    });

    it("counts UNPARSEABLE failures", () => {
      const rows: RawDatasetRow[] = [
        { id: "1", prompt: "p", expected: '{"name":"Alice"}', actual: "not json" },
        { id: "2", prompt: "p", expected: '{"name":"Bob"}', actual: "also not json" },
      ];
      const { summary } = evaluateDataset(rows, schema);
      expect(summary.failureReasons.UNPARSEABLE).toBe(2);
    });

    it("counts multiple distinct failure types across rows", () => {
      const rows: RawDatasetRow[] = [
        // WRONG_VALUE
        { id: "1", prompt: "p", expected: '{"name":"Alice"}', actual: '{"name":"Wrong"}' },
        // UNPARSEABLE
        { id: "2", prompt: "p", expected: '{"name":"Bob"}', actual: "bad json" },
      ];
      const { summary } = evaluateDataset(rows, schema);
      expect(summary.failureReasons.WRONG_VALUE).toBe(1);
      expect(summary.failureReasons.UNPARSEABLE).toBe(1);
    });
  });

  describe("row results", () => {
    it("returns a RowResult for every input row", () => {
      const rows = [
        makeRow("1", { name: "Alice" }, { name: "Alice" }),
        makeRow("2", { name: "Bob" }, { name: "Wrong" }),
      ];
      const { rowResults } = evaluateDataset(rows, schema);
      expect(rowResults).toHaveLength(2);
    });

    it("preserves row ids in results", () => {
      const rows = [
        makeRow("row-a", { name: "Alice" }, { name: "Alice" }),
        makeRow("row-b", { name: "Bob" }, { name: "Bob" }),
      ];
      const { rowResults } = evaluateDataset(rows, schema);
      expect(rowResults[0].id).toBe("row-a");
      expect(rowResults[1].id).toBe("row-b");
    });
  });
});
