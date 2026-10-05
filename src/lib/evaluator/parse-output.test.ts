import { describe, it, expect } from "vitest";
import { parseOutput } from "./parse-output";

describe("parseOutput", () => {
  it("parses bare JSON without a wrapper", () => {
    expect(parseOutput('{"a":1}')).toEqual({ ok: true, value: { a: 1 }, wrapper: null });
  });

  it("parses non-object JSON strictly (null, numbers)", () => {
    expect(parseOutput("null")).toEqual({ ok: true, value: null, wrapper: null });
    expect(parseOutput("42")).toEqual({ ok: true, value: 42, wrapper: null });
  });

  it("recovers JSON from a ```json fence", () => {
    const text = 'Here you go:\n```json\n{"a": 1}\n```';
    expect(parseOutput(text)).toEqual({ ok: true, value: { a: 1 }, wrapper: "fence" });
  });

  it("recovers JSON from a fence without a language tag", () => {
    expect(parseOutput('```\n{"a": [1, 2]}\n```')).toEqual({
      ok: true,
      value: { a: [1, 2] },
      wrapper: "fence",
    });
  });

  it("recovers the first object embedded in prose", () => {
    const text = 'Sure! The extracted data is {"name": "Acme", "note": "uses {braces}"}. Hope that helps.';
    expect(parseOutput(text)).toEqual({
      ok: true,
      value: { name: "Acme", note: "uses {braces}" },
      wrapper: "prose",
    });
  });

  it("skips a non-JSON brace span and keeps looking", () => {
    const text = 'Using {placeholder} syntax: {"a": 1}';
    expect(parseOutput(text)).toMatchObject({ ok: true, value: { a: 1 }, wrapper: "prose" });
  });

  it("fails on prose with no JSON", () => {
    expect(parseOutput("I found information about Acme but could not structure it.")).toEqual({
      ok: false,
    });
  });

  it("fails on truncated JSON", () => {
    expect(parseOutput('{"name": "Acme", "city": "Ber')).toEqual({ ok: false });
  });

  it("fails on empty and whitespace-only output", () => {
    expect(parseOutput("")).toEqual({ ok: false });
    expect(parseOutput("   ")).toEqual({ ok: false });
  });
});
