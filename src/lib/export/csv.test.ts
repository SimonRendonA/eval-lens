import { describe, it, expect } from "vitest";
import { exportToCsv } from "./csv";
import type { EvaluationResult, ExportMeta } from "../types";

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
      expect(lines[4]).toBe("id,status,failure_reasons,failure_details");
    });

    it("produces one data row per result row", () => {
      const result = makeResult([
        { id: "1", status: "pass", failures: [] },
        { id: "2", status: "pass", failures: [] },
      ]);
      const lines = exportToCsv(result).split("\n");
      expect(lines).toHaveLength(7); // 3 comments + blank + header + 2 rows
    });
  });

  describe("passing rows", () => {
    it("outputs pass row with empty failure columns", () => {
      const result = makeResult([{ id: "1", status: "pass", failures: [] }]);
      const csv = exportToCsv(result);
      const dataLine = csv.split("\n")[5];
      expect(dataLine).toBe("1,pass,,");
    });
  });

  describe("report metadata comments", () => {
    it("includes hosted comments by default", () => {
      const csv = exportToCsv(makeResult([]));
      expect(csv).toContain("# Mode: hosted");
      expect(csv).toContain("# Output source: uploaded");
    });

    it("includes self-hosted provider and narrative comments when present", () => {
      const meta: ExportMeta = {
        mode: "self-hosted",
        outputSource: "generated",
        generatedRowCount: 5,
        provider: "gemini",
        model: "gemini-2.5-pro",
        narrative: {
          summary: "Most failures come from schema drift.",
          patterns: [
            {
              title: "Schema drift",
              description: "Nested fields are omitted or renamed.",
              affectedCount: 4,
              exampleIds: ["3", "4"],
            },
          ],
          recommendation: "Pin the JSON schema in the system prompt.",
        },
      };

      const csv = exportToCsv(makeResult([]), meta);
      expect(csv).toContain("# Provider: gemini");
      expect(csv).toContain("# Generated rows: 5");
      expect(csv).toContain("# Failure analysis summary: Most failures come from schema drift.");
      expect(csv).toContain("# Recommended next step: Pin the JSON schema in the system prompt.");
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
