import { describe, it, expect } from "vitest";
import { evaluateRow } from "./evaluate-row";
import type { RawDatasetRow, InferredSchema } from "../types";

function makeRow(id: string, expected: unknown, actual: unknown): RawDatasetRow {
  return {
    id,
    prompt: "test prompt",
    expected: JSON.stringify(expected),
    actual: JSON.stringify(actual),
  };
}

const simpleSchema: InferredSchema = {
  fields: [
    { name: "name", type: "string", required: true },
    { name: "age", type: "number", required: true },
  ],
};

describe("evaluateRow", () => {
  describe("passing cases", () => {
    it("returns pass when expected and actual are identical", () => {
      const row = makeRow("1", { name: "Alice", age: 30 }, { name: "Alice", age: 30 });
      const result = evaluateRow(row, simpleSchema);
      expect(result.status).toBe("pass");
      expect(result.failures).toHaveLength(0);
      expect(result.id).toBe("1");
    });

    it("returns pass for deeply equal objects", () => {
      const schema: InferredSchema = {
        fields: [{ name: "data", type: "object", required: true }],
      };
      const obj = { data: { a: 1, b: [2, 3] } };
      const row = makeRow("1", obj, { data: { a: 1, b: [2, 3] } });
      expect(evaluateRow(row, schema).status).toBe("pass");
    });

    it("returns pass for deeply equal arrays", () => {
      const schema: InferredSchema = {
        fields: [{ name: "tags", type: "array", required: true }],
      };
      const row = makeRow("1", { tags: ["a", "b"] }, { tags: ["a", "b"] });
      expect(evaluateRow(row, schema).status).toBe("pass");
    });
  });

  describe("UNPARSEABLE failures", () => {
    it("fails with UNPARSEABLE when expected is invalid JSON", () => {
      const row: RawDatasetRow = {
        id: "1",
        prompt: "p",
        expected: "not json",
        actual: '{"name":"Alice","age":30}',
      };
      const result = evaluateRow(row, simpleSchema);
      expect(result.status).toBe("fail");
      expect(result.failures[0]).toMatchObject({
        reason: "UNPARSEABLE",
        field: "_root",
      });
    });

    it("fails with UNPARSEABLE when actual is invalid JSON", () => {
      const row: RawDatasetRow = {
        id: "1",
        prompt: "p",
        expected: '{"name":"Alice","age":30}',
        actual: "not json",
      };
      const result = evaluateRow(row, simpleSchema);
      expect(result.status).toBe("fail");
      expect(result.failures[0]).toMatchObject({
        reason: "UNPARSEABLE",
        field: "_root",
        actual: "not json",
      });
    });

    it("fails with UNPARSEABLE when actual is empty string", () => {
      const row: RawDatasetRow = {
        id: "1",
        prompt: "p",
        expected: '{"name":"Alice","age":30}',
        actual: "",
      };
      const result = evaluateRow(row, simpleSchema);
      expect(result.status).toBe("fail");
      expect(result.failures[0].reason).toBe("UNPARSEABLE");
    });
  });

  describe("MISSING_FIELD failures", () => {
    it("fails with MISSING_FIELD when required field is absent", () => {
      const row = makeRow("1", { name: "Alice", age: 30 }, { name: "Alice" });
      const result = evaluateRow(row, simpleSchema);
      expect(result.status).toBe("fail");
      const missing = result.failures.find((f) => f.reason === "MISSING_FIELD");
      expect(missing).toBeDefined();
      expect(missing?.field).toBe("age");
    });
  });

  describe("WRONG_TYPE failures", () => {
    it("fails with WRONG_TYPE when field has incorrect type", () => {
      const row = makeRow("1", { name: "Alice", age: 30 }, { name: "Alice", age: "thirty" });
      const result = evaluateRow(row, simpleSchema);
      expect(result.status).toBe("fail");
      const wrongType = result.failures.find((f) => f.reason === "WRONG_TYPE");
      expect(wrongType?.field).toBe("age");
      expect(wrongType?.expected).toBe("number");
      expect(wrongType?.actual).toBe("string");
    });
  });

  describe("WRONG_VALUE failures", () => {
    it("fails with WRONG_VALUE when string value is different", () => {
      const row = makeRow("1", { name: "Alice", age: 30 }, { name: "Bob", age: 30 });
      const result = evaluateRow(row, simpleSchema);
      expect(result.status).toBe("fail");
      const wrongVal = result.failures.find((f) => f.reason === "WRONG_VALUE");
      expect(wrongVal?.field).toBe("name");
      expect(wrongVal?.expected).toBe("Alice");
      expect(wrongVal?.actual).toBe("Bob");
    });

    it("fails with WRONG_VALUE when number value is different", () => {
      const row = makeRow("1", { name: "Alice", age: 30 }, { name: "Alice", age: 31 });
      const result = evaluateRow(row, simpleSchema);
      const wrongVal = result.failures.find((f) => f.reason === "WRONG_VALUE");
      expect(wrongVal?.field).toBe("age");
    });

    it("fails with WRONG_VALUE for mismatched nested objects", () => {
      const schema: InferredSchema = {
        fields: [{ name: "address", type: "object", required: true }],
      };
      const row = makeRow(
        "1",
        { address: { city: "NY" } },
        { address: { city: "LA" } },
      );
      const result = evaluateRow(row, schema);
      expect(result.failures.find((f) => f.reason === "WRONG_VALUE")).toBeDefined();
    });

    it("fails with WRONG_VALUE for mismatched arrays", () => {
      const schema: InferredSchema = {
        fields: [{ name: "tags", type: "array", required: true }],
      };
      const row = makeRow("1", { tags: ["a"] }, { tags: ["b"] });
      const result = evaluateRow(row, schema);
      expect(result.failures.find((f) => f.reason === "WRONG_VALUE")).toBeDefined();
    });
  });

  describe("EXTRA_FIELD failures", () => {
    it("fails with EXTRA_FIELD when actual has keys not in schema", () => {
      const row = makeRow(
        "1",
        { name: "Alice", age: 30 },
        { name: "Alice", age: 30, extra: "unexpected" },
      );
      const result = evaluateRow(row, simpleSchema);
      expect(result.status).toBe("fail");
      const extra = result.failures.find((f) => f.reason === "EXTRA_FIELD");
      expect(extra?.field).toBe("extra");
    });
  });

  describe("structural failures skip value comparison", () => {
    it("does not add WRONG_VALUE for a field that already has WRONG_TYPE", () => {
      const row = makeRow("1", { name: "Alice", age: 30 }, { name: "Alice", age: "not a number" });
      const result = evaluateRow(row, simpleSchema);
      const reasons = result.failures.map((f) => f.reason);
      expect(reasons).toContain("WRONG_TYPE");
      expect(reasons).not.toContain("WRONG_VALUE");
    });

    it("does not add WRONG_VALUE for a field that has MISSING_FIELD", () => {
      const row = makeRow("1", { name: "Alice", age: 30 }, { name: "Alice" });
      const result = evaluateRow(row, simpleSchema);
      const reasons = result.failures.map((f) => f.reason);
      expect(reasons).toContain("MISSING_FIELD");
      expect(reasons).not.toContain("WRONG_VALUE");
    });
  });

  describe("multiple failures at once", () => {
    it("reports all failures in a single row", () => {
      const row = makeRow(
        "1",
        { name: "Alice", age: 30 },
        { name: 42, extra: true }, // wrong type for name, missing age, extra field
      );
      const result = evaluateRow(row, simpleSchema);
      expect(result.status).toBe("fail");
      const reasons = result.failures.map((f) => f.reason);
      expect(reasons).toContain("WRONG_TYPE");
      expect(reasons).toContain("MISSING_FIELD");
      expect(reasons).toContain("EXTRA_FIELD");
    });
  });
});
