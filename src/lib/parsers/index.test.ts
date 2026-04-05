import { describe, it, expect } from "vitest";
import { parseFile } from "./index";

describe("parseFile", () => {
  const validCsv = `id,prompt,expected,actual\n1,p,{"a":1},{"a":1}`;
  const validJsonl = `{"id":"1","prompt":"p","expected":{"a":1},"actual":{"a":1}}`;

  it("dispatches to CSV parser for .csv files", () => {
    const { rows } = parseFile(validCsv, "data.csv");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("1");
  });

  it("dispatches to JSONL parser for .jsonl files", () => {
    const { rows } = parseFile(validJsonl, "data.jsonl");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("1");
  });

  it("dispatches to JSONL parser for .json files", () => {
    const { rows } = parseFile(validJsonl, "data.json");
    expect(rows).toHaveLength(1);
  });

  it("is case-insensitive for extensions", () => {
    const { rows } = parseFile(validCsv, "data.CSV");
    expect(rows).toHaveLength(1);
  });

  it("throws for unsupported file extensions", () => {
    expect(() => parseFile("content", "data.xlsx")).toThrow(
      /Unsupported file type: .xlsx/,
    );
  });

  it("throws for files with no extension", () => {
    expect(() => parseFile("content", "datafile")).toThrow(
      /Unsupported file type/,
    );
  });

  it("uses last segment when filename has multiple dots", () => {
    const { rows } = parseFile(validCsv, "my.eval.data.csv");
    expect(rows).toHaveLength(1);
  });
});
