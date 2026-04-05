import { describe, it, expect } from "vitest";
import { validateAgainstSchema } from "./validate";
import type { InferredSchema } from "../types";

function makeSchema(fields: { name: string; type: string; required: boolean }[]): InferredSchema {
  return { fields: fields as InferredSchema["fields"] };
}

describe("validateAgainstSchema", () => {
  describe("passing cases", () => {
    it("returns no failures when all required fields are present with correct types", () => {
      const schema = makeSchema([
        { name: "name", type: "string", required: true },
        { name: "age", type: "number", required: true },
      ]);
      const actual = { name: "Alice", age: 30 };
      expect(validateAgainstSchema(actual, schema)).toHaveLength(0);
    });

    it("returns no failures when an optional field is absent", () => {
      const schema = makeSchema([
        { name: "name", type: "string", required: true },
        { name: "role", type: "string", required: false },
      ]);
      const actual = { name: "Alice" };
      expect(validateAgainstSchema(actual, schema)).toHaveLength(0);
    });

    it("returns no failures when optional field is present with correct type", () => {
      const schema = makeSchema([
        { name: "name", type: "string", required: false },
      ]);
      const actual = { name: "Alice" };
      expect(validateAgainstSchema(actual, schema)).toHaveLength(0);
    });
  });

  describe("MISSING_FIELD", () => {
    it("reports MISSING_FIELD when a required field is absent", () => {
      const schema = makeSchema([
        { name: "name", type: "string", required: true },
      ]);
      const failures = validateAgainstSchema({}, schema);
      expect(failures).toHaveLength(1);
      expect(failures[0]).toMatchObject({
        reason: "MISSING_FIELD",
        field: "name",
        expected: "string",
        actual: undefined,
      });
    });

    it("does NOT report MISSING_FIELD for optional absent fields", () => {
      const schema = makeSchema([
        { name: "role", type: "string", required: false },
      ]);
      const failures = validateAgainstSchema({}, schema);
      expect(failures).toHaveLength(0);
    });
  });

  describe("WRONG_TYPE", () => {
    it("reports WRONG_TYPE when field type does not match", () => {
      const schema = makeSchema([
        { name: "age", type: "number", required: true },
      ]);
      const failures = validateAgainstSchema({ age: "thirty" }, schema);
      expect(failures).toHaveLength(1);
      expect(failures[0]).toMatchObject({
        reason: "WRONG_TYPE",
        field: "age",
        expected: "number",
        actual: "string",
      });
    });

    it("reports WRONG_TYPE when boolean is provided instead of string", () => {
      const schema = makeSchema([
        { name: "name", type: "string", required: true },
      ]);
      const failures = validateAgainstSchema({ name: true }, schema);
      expect(failures[0].reason).toBe("WRONG_TYPE");
    });

    it("reports WRONG_TYPE when array is provided instead of object", () => {
      const schema = makeSchema([
        { name: "data", type: "object", required: true },
      ]);
      const failures = validateAgainstSchema({ data: [1, 2] }, schema);
      expect(failures[0]).toMatchObject({ reason: "WRONG_TYPE", actual: "array" });
    });

    it("reports WRONG_TYPE when null is provided instead of string", () => {
      const schema = makeSchema([
        { name: "name", type: "string", required: true },
      ]);
      const failures = validateAgainstSchema({ name: null }, schema);
      expect(failures[0]).toMatchObject({ reason: "WRONG_TYPE", actual: "null" });
    });
  });

  describe("EXTRA_FIELD", () => {
    it("reports EXTRA_FIELD for keys not in the schema", () => {
      const schema = makeSchema([
        { name: "name", type: "string", required: true },
      ]);
      const failures = validateAgainstSchema({ name: "Alice", extra: "value" }, schema);
      expect(failures).toHaveLength(1);
      expect(failures[0]).toMatchObject({
        reason: "EXTRA_FIELD",
        field: "extra",
        expected: undefined,
        actual: "value",
      });
    });

    it("reports multiple EXTRA_FIELD failures for multiple unknown keys", () => {
      const schema = makeSchema([
        { name: "name", type: "string", required: true },
      ]);
      const failures = validateAgainstSchema({ name: "A", x: 1, y: 2 }, schema);
      const extras = failures.filter((f) => f.reason === "EXTRA_FIELD");
      expect(extras).toHaveLength(2);
    });
  });

  describe("combined failures", () => {
    it("reports multiple failure types simultaneously", () => {
      const schema = makeSchema([
        { name: "name", type: "string", required: true },
        { name: "age", type: "number", required: true },
      ]);
      // missing 'age', wrong type for 'name', extra 'foo'
      const actual = { name: 42, foo: "extra" };
      const failures = validateAgainstSchema(actual, schema);
      const reasons = failures.map((f) => f.reason);
      expect(reasons).toContain("MISSING_FIELD"); // age
      expect(reasons).toContain("WRONG_TYPE");    // name
      expect(reasons).toContain("EXTRA_FIELD");   // foo
    });
  });
});
