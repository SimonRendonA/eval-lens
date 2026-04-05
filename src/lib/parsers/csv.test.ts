import { describe, it, expect } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  describe("valid input", () => {
    it("parses a complete row with all columns", () => {
      const csv = `id,prompt,expected,actual\n1,Extract name,{"name":"Alice"},{"name":"Alice"}`;
      const { rows, errors } = parseCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        id: "1",
        prompt: "Extract name",
        expected: '{"name":"Alice"}',
        actual: '{"name":"Alice"}',
      });
    });

    it("parses multiple rows", () => {
      const csv = `id,prompt,expected,actual\n1,p1,{"a":1},{"a":1}\n2,p2,{"b":2},{"b":2}`;
      const { rows, errors } = parseCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows).toHaveLength(2);
      expect(rows[0].id).toBe("1");
      expect(rows[1].id).toBe("2");
    });

    it("defaults actual to empty string when column is absent", () => {
      const csv = `id,prompt,expected\n1,Prompt,{"name":"Alice"}`;
      const { rows, errors } = parseCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows[0].actual).toBe("");
    });

    it("defaults actual to empty string when cell is empty", () => {
      const csv = `id,prompt,expected,actual\n1,Prompt,{"name":"Alice"},`;
      const { rows, errors } = parseCsv(csv);
      expect(errors).toHaveLength(0);
      expect(rows[0].actual).toBe("");
    });

    it("trims whitespace from field values", () => {
      const csv = `id,prompt,expected,actual\n  1  ,  My prompt  ,  {"x":1}  ,  {"x":1}  `;
      const { rows } = parseCsv(csv);
      expect(rows[0].id).toBe("1");
      expect(rows[0].prompt).toBe("My prompt");
      expect(rows[0].expected).toBe('{"x":1}');
      expect(rows[0].actual).toBe('{"x":1}');
    });
  });

  describe("missing required columns", () => {
    it("throws when id column is missing", () => {
      const csv = `prompt,expected,actual\nHello,{"a":1},{"a":1}`;
      expect(() => parseCsv(csv)).toThrow(/Missing required columns.*id/);
    });

    it("throws when prompt column is missing", () => {
      const csv = `id,expected,actual\n1,{"a":1},{"a":1}`;
      expect(() => parseCsv(csv)).toThrow(/Missing required columns.*prompt/);
    });

    it("throws when expected column is missing", () => {
      const csv = `id,prompt,actual\n1,Prompt,{"a":1}`;
      expect(() => parseCsv(csv)).toThrow(/Missing required columns.*expected/);
    });

    it("includes found columns in the error message", () => {
      const csv = `foo,bar\nval1,val2`;
      expect(() => parseCsv(csv)).toThrow(/Found: foo, bar/);
    });
  });

  describe("missing required values (non-fatal errors)", () => {
    it("skips row with empty id and adds error", () => {
      const csv = `id,prompt,expected,actual\n,Has prompt,{"a":1},{"a":1}`;
      const { rows, errors } = parseCsv(csv);
      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(/Missing values for:.*id/);
    });

    it("skips row with empty prompt and adds error", () => {
      const csv = `id,prompt,expected,actual\n1,,{"a":1},{"a":1}`;
      const { rows, errors } = parseCsv(csv);
      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(/Missing values for:.*prompt/);
    });

    it("skips row with empty expected and adds error", () => {
      const csv = `id,prompt,expected,actual\n1,My prompt,,{"a":1}`;
      const { rows, errors } = parseCsv(csv);
      expect(rows).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(/Missing values for:.*expected/);
    });

    it("uses row number as id when id is empty", () => {
      const csv = `id,prompt,expected,actual\n,Has prompt,{"a":1},{"a":1}`;
      const { errors } = parseCsv(csv);
      expect(errors[0].row).toBe("row 2");
    });

    it("uses existing id value in error report", () => {
      const csv = `id,prompt,expected,actual\nrow-42,,{"a":1},{"a":1}`;
      const { errors } = parseCsv(csv);
      expect(errors[0].row).toBe("row-42");
    });

    it("still parses valid rows when other rows have errors", () => {
      const csv = `id,prompt,expected,actual\n1,p1,{"a":1},{"a":1}\n2,,{"b":2},{"b":2}\n3,p3,{"c":3},{"c":3}`;
      const { rows, errors } = parseCsv(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0].id).toBe("1");
      expect(rows[1].id).toBe("3");
      expect(errors).toHaveLength(1);
    });
  });

  describe("row number accounting", () => {
    it("reports row numbers as 1-indexed + header offset", () => {
      const csv = `id,prompt,expected,actual\n,p,{"a":1},{"a":1}`;
      const { errors } = parseCsv(csv);
      // Row 1 is the header, so first data row is row 2
      expect(errors[0].row).toBe("row 2");
    });
  });
});
