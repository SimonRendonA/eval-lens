import { describe, it, expect } from "vitest";
import { parseJson } from "./json";

describe("parseJson", () => {
  it("parses an array of row objects", () => {
    const content = JSON.stringify([
      { id: 1, prompt: "p1", expected: { a: 1 }, actual: { a: 1 } },
      { id: 2, prompt: "p2", expected: { a: 2 }, actual: { a: 3 } },
    ]);
    const { rows, errors } = parseJson(content);
    expect(errors).toHaveLength(0);
    expect(rows).toEqual([
      { id: "1", prompt: "p1", expected: '{"a":1}', actual: '{"a":1}' },
      { id: "2", prompt: "p2", expected: '{"a":2}', actual: '{"a":3}' },
    ]);
  });

  it("parses pretty-printed JSON spanning many lines", () => {
    const content = JSON.stringify(
      [{ id: "1", prompt: "p", expected: { a: 1 } }],
      null,
      2,
    );
    const { rows, errors } = parseJson(content);
    expect(errors).toHaveLength(0);
    expect(rows).toEqual([{ id: "1", prompt: "p", expected: '{"a":1}', actual: "" }]);
  });

  it("treats a single object as a one-row dataset", () => {
    const { rows } = parseJson('{"id":"1","prompt":"p","expected":{"a":1}}');
    expect(rows).toHaveLength(1);
  });

  it("skips invalid array elements and reports their position", () => {
    const content = JSON.stringify([
      { id: "1", prompt: "p", expected: { a: 1 } },
      "not a row",
      { id: "3", prompt: "p" },
    ]);
    const { rows, errors } = parseJson(content);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([
      { row: 2, message: "Row must be a JSON object" },
      { row: "3", message: "Missing keys: expected" },
    ]);
  });

  it("falls back to JSON Lines when the file isn't a single document", () => {
    const content = [
      '{"id":"1","prompt":"p","expected":{"a":1}}',
      '{"id":"2","prompt":"p","expected":{"a":2}}',
    ].join("\n");
    expect(parseJson(content).rows.map((r) => r.id)).toEqual(["1", "2"]);
  });

  it("throws for an empty file or an empty array", () => {
    expect(() => parseJson("  ")).toThrow("File is empty");
    expect(() => parseJson("[]")).toThrow("File is empty");
  });

  it("throws for a document that is neither an array nor an object", () => {
    expect(() => parseJson('"hello"')).toThrow(/array of rows or a single row object/);
  });
});
