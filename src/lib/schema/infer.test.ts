import { describe, it, expect } from "vitest";
import { inferSchema } from "./infer";
import type { RawDatasetRow } from "../types";

function makeRow(id: string, expected: unknown): RawDatasetRow {
  return {
    id,
    prompt: "test prompt",
    expected: JSON.stringify(expected),
    actual: "",
  };
}

describe("inferSchema", () => {
  describe("throws on invalid input", () => {
    it("throws when rows array is empty", () => {
      expect(() => inferSchema([])).toThrow("Cannot infer schema from empty dataset");
    });

    it("throws when expected field is not valid JSON", () => {
      const rows: RawDatasetRow[] = [
        { id: "1", prompt: "p", expected: "not json", actual: "" },
      ];
      expect(() => inferSchema(rows)).toThrow(/Row 1.*failed to parse/);
    });

    it("throws when expected is a JSON string (not an object)", () => {
      const rows: RawDatasetRow[] = [
        { id: "1", prompt: "p", expected: '"just a string"', actual: "" },
      ];
      expect(() => inferSchema(rows)).toThrow(/Row 1.*expected value must be a JSON object/);
    });

    it("throws when expected is a JSON array", () => {
      const rows: RawDatasetRow[] = [
        { id: "1", prompt: "p", expected: '[1,2,3]', actual: "" },
      ];
      expect(() => inferSchema(rows)).toThrow(/Row 1.*expected value must be a JSON object/);
    });

    it("throws when expected is null", () => {
      const rows: RawDatasetRow[] = [
        { id: "1", prompt: "p", expected: "null", actual: "" },
      ];
      expect(() => inferSchema(rows)).toThrow(/Row 1.*expected value must be a JSON object/);
    });
  });

  describe("type detection", () => {
    it("detects string type", () => {
      const { fields } = inferSchema([makeRow("1", { name: "Alice" })]);
      expect(fields.find((f) => f.name === "name")?.type).toBe("string");
    });

    it("detects number type", () => {
      const { fields } = inferSchema([makeRow("1", { age: 30 })]);
      expect(fields.find((f) => f.name === "age")?.type).toBe("number");
    });

    it("detects boolean type", () => {
      const { fields } = inferSchema([makeRow("1", { active: true })]);
      expect(fields.find((f) => f.name === "active")?.type).toBe("boolean");
    });

    it("detects object type", () => {
      const { fields } = inferSchema([makeRow("1", { address: { city: "NY" } })]);
      expect(fields.find((f) => f.name === "address")?.type).toBe("object");
    });

    it("detects array type", () => {
      const { fields } = inferSchema([makeRow("1", { tags: ["a", "b"] })]);
      expect(fields.find((f) => f.name === "tags")?.type).toBe("array");
    });

    it("detects null type", () => {
      const { fields } = inferSchema([makeRow("1", { value: null })]);
      expect(fields.find((f) => f.name === "value")?.type).toBe("null");
    });
  });

  describe("required field inference", () => {
    it("marks a field as required when it appears in all rows", () => {
      const rows = [
        makeRow("1", { name: "Alice" }),
        makeRow("2", { name: "Bob" }),
      ];
      const { fields } = inferSchema(rows);
      expect(fields.find((f) => f.name === "name")?.required).toBe(true);
    });

    it("marks a field as optional when it appears in only some rows", () => {
      const rows = [
        makeRow("1", { name: "Alice", role: "admin" }),
        makeRow("2", { name: "Bob" }),
      ];
      const { fields } = inferSchema(rows);
      expect(fields.find((f) => f.name === "role")?.required).toBe(false);
    });

    it("marks a field as optional when it appears in only one of many rows", () => {
      const rows = [
        makeRow("1", { name: "Alice" }),
        makeRow("2", { name: "Bob" }),
        makeRow("3", { name: "Charlie", rare: true }),
      ];
      const { fields } = inferSchema(rows);
      expect(fields.find((f) => f.name === "rare")?.required).toBe(false);
    });
  });

  describe("multi-field schemas", () => {
    it("collects all unique keys across all rows", () => {
      const rows = [
        makeRow("1", { name: "Alice", age: 30 }),
        makeRow("2", { name: "Bob", role: "admin" }),
      ];
      const { fields } = inferSchema(rows);
      const names = fields.map((f) => f.name);
      expect(names).toContain("name");
      expect(names).toContain("age");
      expect(names).toContain("role");
    });

    it("uses type from the first row that has the key", () => {
      const rows = [
        makeRow("1", { count: 5 }),
        makeRow("2", { count: 10 }),
      ];
      const { fields } = inferSchema(rows);
      expect(fields.find((f) => f.name === "count")?.type).toBe("number");
    });
  });

  describe("single row", () => {
    it("marks all fields as required when there is only one row", () => {
      const { fields } = inferSchema([makeRow("1", { a: 1, b: "x" })]);
      expect(fields.every((f) => f.required)).toBe(true);
    });
  });
});
