import { describe, it, expect } from "vitest";
import { parseJsonl } from "./jsonl";

describe("parseJsonl", () => {
  describe("valid input", () => {
    it("parses a complete line with all keys", () => {
      const jsonl = `{"id":"1","prompt":"Extract name","expected":{"name":"Alice"},"actual":{"name":"Alice"}}`;
      const { rows, errors } = parseJsonl(jsonl);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("1");
      expect(rows[0].prompt).toBe("Extract name");
    });

    it("defaults actual to empty string when key is missing", () => {
      const jsonl = `{"id":"1","prompt":"p","expected":{"a":1}}`;
      const { rows, errors } = parseJsonl(jsonl);
      expect(errors).toHaveLength(0);
      expect(rows[0].actual).toBe("");
    });

    it("JSON-stringifies non-string expected values", () => {
      const jsonl = `{"id":"1","prompt":"p","expected":{"name":"Alice"},"actual":{"name":"Alice"}}`;
      const { rows } = parseJsonl(jsonl);
      expect(rows[0].expected).toBe('{"name":"Alice"}');
      expect(rows[0].actual).toBe('{"name":"Alice"}');
    });

    it("preserves string expected/actual values as-is", () => {
      const jsonl = `{"id":"1","prompt":"p","expected":"{\\"name\\":\\"Alice\\"}","actual":"{\\"name\\":\\"Alice\\"}"}`;
      const { rows } = parseJsonl(jsonl);
      expect(rows[0].expected).toBe('{"name":"Alice"}');
    });

    it("parses multiple lines", () => {
      const jsonl = [
        `{"id":"1","prompt":"p1","expected":{"a":1},"actual":{"a":1}}`,
        `{"id":"2","prompt":"p2","expected":{"b":2},"actual":{"b":2}}`,
      ].join("\n");
      const { rows, errors } = parseJsonl(jsonl);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(2);
    });

    it("ignores blank lines", () => {
      const jsonl = `{"id":"1","prompt":"p","expected":{"a":1}}\n\n\n`;
      const { rows, errors } = parseJsonl(jsonl);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
    });

    it("converts numeric id to string", () => {
      const jsonl = `{"id":42,"prompt":"p","expected":{"a":1}}`;
      const { rows } = parseJsonl(jsonl);
      expect(rows[0].id).toBe("42");
    });
  });

  describe("throws on empty input", () => {
    it("throws when the file is empty", () => {
      expect(() => parseJsonl("")).toThrow("File is empty");
    });

    it("throws when all lines are blank", () => {
      expect(() => parseJsonl("   \n  \n  ")).toThrow("File is empty");
    });
  });

  describe("non-fatal line errors", () => {
    it("records error and skips line with invalid JSON", () => {
      const jsonl = `not json`;
      const { rows, errors } = parseJsonl(jsonl);
      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].row).toBe(1);
      expect(errors[0].message).toBe("Invalid JSON");
    });

    it("records error and skips line that is a JSON array", () => {
      const jsonl = `[1,2,3]`;
      const { rows, errors } = parseJsonl(jsonl);
      expect(rows).toHaveLength(0);
      expect(errors[0].message).toBe("Line must be a JSON object");
    });

    it("records error and skips line that is null", () => {
      const jsonl = `null`;
      const { rows, errors } = parseJsonl(jsonl);
      expect(errors[0].message).toBe("Line must be a JSON object");
    });

    it("records error and skips line missing required keys", () => {
      const jsonl = `{"id":"1","prompt":"p"}`;
      const { rows, errors } = parseJsonl(jsonl);
      expect(rows).toHaveLength(0);
      expect(errors[0].message).toMatch(/Missing keys:.*expected/);
    });

    it("uses row's id in the error when available", () => {
      const jsonl = `{"id":"row-99","prompt":"p"}`;
      const { errors } = parseJsonl(jsonl);
      expect(errors[0].row).toBe("row-99");
    });

    it("uses line number in error when id is missing", () => {
      const jsonl = `{"prompt":"p","expected":{"a":1}}`;
      const { errors } = parseJsonl(jsonl);
      expect(errors[0].row).toBe(1);
    });

    it("still parses valid lines when other lines have errors", () => {
      const jsonl = [
        `{"id":"1","prompt":"p","expected":{"a":1}}`,
        `not json`,
        `{"id":"3","prompt":"p","expected":{"c":3}}`,
      ].join("\n");
      const { rows, errors } = parseJsonl(jsonl);
      expect(rows).toHaveLength(2);
      expect(errors).toHaveLength(1);
    });
  });
});
