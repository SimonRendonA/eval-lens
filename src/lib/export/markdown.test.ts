import { describe, it, expect } from "vitest";
import { exportToMarkdown } from "./markdown";
import type { EvaluationResult } from "../types";

function makeResult(overrides: Partial<EvaluationResult> = {}): EvaluationResult {
  return {
    summary: {
      total: 3,
      passed: 2,
      failed: 1,
      passRate: 2 / 3,
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
      { id: "2", status: "pass", failures: [] },
      {
        id: "3",
        status: "fail",
        failures: [{ reason: "WRONG_VALUE", field: "name", expected: "Alice", actual: "Bob" }],
      },
    ],
    ...overrides,
  };
}

describe("exportToMarkdown", () => {
  describe("document structure", () => {
    it("starts with the EvalLens Report heading", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toMatch(/^# EvalLens Report/);
    });

    it("includes a Generated date line", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toMatch(/Generated: \d{4}-\d{2}-\d{2}/);
    });

    it("contains a Summary section", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("## Summary");
    });

    it("contains a Row Results section", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("## Row Results");
    });
  });

  describe("summary table", () => {
    it("includes total row count", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("| Total rows | 3 |");
    });

    it("includes passed count", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("| Passed | 2 |");
    });

    it("includes failed count", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("| Failed | 1 |");
    });

    it("includes pass rate as rounded percentage", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("| Pass rate | 67% |");
    });

    it("shows 100% for perfect pass rate", () => {
      const result = makeResult({
        summary: {
          total: 2,
          passed: 2,
          failed: 0,
          passRate: 1,
          failureReasons: {
            SCHEMA_MISMATCH: 0,
            MISSING_FIELD: 0,
            WRONG_TYPE: 0,
            WRONG_VALUE: 0,
            EXTRA_FIELD: 0,
            UNPARSEABLE: 0,
          },
        },
        rowResults: [
          { id: "1", status: "pass", failures: [] },
          { id: "2", status: "pass", failures: [] },
        ],
      });
      expect(exportToMarkdown(result)).toContain("| Pass rate | 100% |");
    });
  });

  describe("failure breakdown section", () => {
    it("includes failure breakdown when there are failures", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("## Failure Breakdown");
      expect(md).toContain("WRONG_VALUE");
    });

    it("omits failure breakdown when all rows pass", () => {
      const result = makeResult({
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          passRate: 1,
          failureReasons: {
            SCHEMA_MISMATCH: 0,
            MISSING_FIELD: 0,
            WRONG_TYPE: 0,
            WRONG_VALUE: 0,
            EXTRA_FIELD: 0,
            UNPARSEABLE: 0,
          },
        },
        rowResults: [{ id: "1", status: "pass", failures: [] }],
      });
      expect(exportToMarkdown(result)).not.toContain("## Failure Breakdown");
    });
  });

  describe("row results table", () => {
    it("lists each row id", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("| 1 |");
      expect(md).toContain("| 2 |");
      expect(md).toContain("| 3 |");
    });

    it("shows pass status for passing rows", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toMatch(/\| 1 \| pass \|/);
    });

    it("shows fail status for failing rows", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toMatch(/\| 3 \| fail \|/);
    });

    it("shows em-dash for rows with no failures", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("| —");
    });
  });

  describe("failure details section", () => {
    it("includes failure details for each failed row", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("## Failure Details");
      expect(md).toContain("### Row 3");
    });

    it("lists reason, field, expected, actual for each failure", () => {
      const md = exportToMarkdown(makeResult());
      expect(md).toContain("WRONG_VALUE");
      expect(md).toContain("`name`");
      expect(md).toContain('"Alice"');
      expect(md).toContain('"Bob"');
    });

    it("omits failure details section when all rows pass", () => {
      const result: EvaluationResult = {
        summary: {
          total: 1,
          passed: 1,
          failed: 0,
          passRate: 1,
          failureReasons: {
            SCHEMA_MISMATCH: 0,
            MISSING_FIELD: 0,
            WRONG_TYPE: 0,
            WRONG_VALUE: 0,
            EXTRA_FIELD: 0,
            UNPARSEABLE: 0,
          },
        },
        rowResults: [{ id: "1", status: "pass", failures: [] }],
      };
      expect(exportToMarkdown(result)).not.toContain("## Failure Details");
    });
  });
});
