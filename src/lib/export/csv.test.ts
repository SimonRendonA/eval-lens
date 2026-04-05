import { describe, it, expect } from "vitest";
import { exportToCsv } from "./csv";
import type { EvaluationResult } from "../types";

function makeResult(rows: EvaluationResult["rowResults"]): EvaluationResult {
  const passed = rows.filter((r) => r.status === "pass").length;
  const failed = rows.filter((r) => r.status === "fail").length;
  return {
    summary: {
      total: rows.length,
      passed,
      failed,
      passRate: rows.length > 0 ? passed / rows.length : 0,
      failureReasons: {
        SCHEMA_MISMATCH: 0,
        MISSING_FIELD: 0,
        WRONG_TYPE: 0,
        WRONG_VALUE: rows.filter((r) => r.failures.some((f) => f.reason === "WRONG_VALUE")).length,
        EXTRA_FIELD: 0,
        UNPARSEABLE: 0,
      },
    },
    rowResults: rows,
  };
}

describe("exportToCsv", () => {
  describe("structure", () => {
    it("includes a header row", () => {
      const result = makeResult([]);
      const csv = exportToCsv(result);
      const lines = csv.split("\n");
      expect(lines[0]).toBe("id,status,failure_reasons,failure_details");
    });

    it("produces one data row per result row", () => {
      const result = makeResult([
        { id: "1", status: "pass", failures: [] },
        { id: "2", status: "pass", failures: [] },
      ]);
      const lines = exportToCsv(result).split("\n");
      expect(lines).toHaveLength(3); // header + 2 rows
    });
  });

  describe("passing rows", () => {
    it("outputs pass row with empty failure columns", () => {
      const result = makeResult([{ id: "1", status: "pass", failures: [] }]);
      const csv = exportToCsv(result);
      const dataLine = csv.split("\n")[1];
      expect(dataLine).toBe("1,pass,,");
    });
  });

  describe("failing rows", () => {
    it("outputs failure reason in failure_reasons column", () => {
      const result = makeResult([
        {
          id: "2",
          status: "fail",
          failures: [{ reason: "WRONG_VALUE", field: "name", expected: "Alice", actual: "Bob" }],
        },
      ]);
      const csv = exportToCsv(result);
      expect(csv).toContain("WRONG_VALUE");
    });

    it("outputs failure details with field, expected, actual", () => {
      const result = makeResult([
        {
          id: "2",
          status: "fail",
          failures: [{ reason: "WRONG_VALUE", field: "name", expected: "Alice", actual: "Bob" }],
        },
      ]);
      const csv = exportToCsv(result);
      expect(csv).toContain("name");
      expect(csv).toContain('"Alice"');
      expect(csv).toContain('"Bob"');
    });

    it("joins multiple failures with semicolons", () => {
      const result = makeResult([
        {
          id: "3",
          status: "fail",
          failures: [
            { reason: "MISSING_FIELD", field: "age", expected: "number", actual: undefined },
            { reason: "WRONG_VALUE", field: "name", expected: "Alice", actual: "Bob" },
          ],
        },
      ]);
      const csv = exportToCsv(result);
      expect(csv).toContain("MISSING_FIELD; WRONG_VALUE");
    });
  });

  describe("CSV escaping", () => {
    it("wraps values with commas in double quotes", () => {
      const result = makeResult([
        {
          id: "id,with,commas",
          status: "pass",
          failures: [],
        },
      ]);
      const csv = exportToCsv(result);
      expect(csv).toContain('"id,with,commas"');
    });

    it("wraps values with newlines in double quotes", () => {
      const result = makeResult([
        {
          id: "id\nwith\nnewline",
          status: "pass",
          failures: [],
        },
      ]);
      const csv = exportToCsv(result);
      expect(csv).toContain('"id\nwith\nnewline"');
    });

    it("escapes double quotes by doubling them", () => {
      const result = makeResult([
        {
          id: 'id"with"quotes',
          status: "pass",
          failures: [],
        },
      ]);
      const csv = exportToCsv(result);
      expect(csv).toContain('"id""with""quotes"');
    });
  });
});
