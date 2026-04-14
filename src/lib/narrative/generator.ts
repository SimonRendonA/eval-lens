import type {
  NarrativeRequest,
  NarrativeResponse,
  NarrativeRow,
} from "./types";

export class NarrativeParseError extends Error {
  rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = "NarrativeParseError";
    this.rawResponse = rawResponse;
  }
}

export function buildNarrativePrompt(request: NarrativeRequest): string {
  const includePrompt = shouldIncludePrompt(request.failedRows);
  const sampledRows = sampleFailedRows(request.failedRows, 20);

  const failureBreakdown = Object.entries(request.failureBreakdown)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reason, count]) => `- ${reason}: ${count}`)
    .join("\n");

  const rowBlocks = sampledRows
    .map((row) => formatRow(row, includePrompt))
    .join("\n\n");

  return [
    "You are analyzing failures from an EvalLens evaluation run.",
    "Respond only with valid JSON. Do not use markdown, backticks, or any prose outside the JSON object.",
    "The JSON must match this TypeScript shape exactly:",
    '{"summary":"string","patterns":[{"title":"string","description":"string","affectedCount":0,"exampleIds":["string"]}],"recommendation":"string"}',
    "Identify 1 to 4 distinct failure patterns.",
    "If the failures are genuinely random, do not invent patterns; return fewer patterns instead.",
    "Provide a single concrete recommendation for what to fix or investigate first.",
    "",
    "Evaluation context:",
    `- Total rows: ${request.totalRows}`,
    `- Failed rows: ${request.failedCount}`,
    `- Passed rows: ${request.passedCount}`,
    "Failure breakdown:",
    failureBreakdown || "- none",
    "",
    `Representative failed rows (${sampledRows.length} of ${request.failedRows.length} shown):`,
    rowBlocks || "none",
  ].join("\n");
}

export function parseNarrativeResponse(raw: string): NarrativeResponse {
  const normalized = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new NarrativeParseError("Failed to parse narrative JSON", raw);
  }

  if (!isNarrativeResponse(parsed)) {
    throw new NarrativeParseError(
      "Narrative response does not match expected shape",
      raw,
    );
  }

  return parsed;
}

function shouldIncludePrompt(rows: NarrativeRow[]): boolean {
  if (rows.length === 0) {
    return false;
  }

  const rowsWithPrompt = rows.filter(
    (row) => typeof row.prompt === "string" && row.prompt.trim().length > 0,
  ).length;

  return rowsWithPrompt / rows.length >= 0.8;
}

function sampleFailedRows(rows: NarrativeRow[], maxRows: number): NarrativeRow[] {
  if (rows.length <= maxRows) {
    return rows;
  }

  const selected: NarrativeRow[] = [];
  const seenIds = new Set<string>();
  const reasons = Array.from(
    new Set(rows.flatMap((row) => row.failureReasons).sort()),
  );

  for (const reason of reasons) {
    const matchingRows = rows.filter((row) => row.failureReasons.includes(reason));
    for (const row of matchingRows.slice(0, 5)) {
      if (!seenIds.has(row.id)) {
        selected.push(row);
        seenIds.add(row.id);
      }
      if (selected.length === maxRows) {
        return selected;
      }
    }
  }

  for (const row of rows) {
    if (!seenIds.has(row.id)) {
      selected.push(row);
      seenIds.add(row.id);
    }
    if (selected.length === maxRows) {
      break;
    }
  }

  return selected;
}

function formatRow(row: NarrativeRow, includePrompt: boolean): string {
  const lines = [
    `id: ${row.id}`,
    ...(includePrompt && row.prompt ? [`prompt: ${row.prompt}`] : []),
    `expected: ${row.expected}`,
    `actual: ${row.actual}`,
    `failureReasons: ${row.failureReasons.join(", ")}`,
  ];

  if (row.fieldFailures && Object.keys(row.fieldFailures).length > 0) {
    const fieldFailures = Object.entries(row.fieldFailures)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([field, reason]) => `${field}: ${reason}`)
      .join(", ");
    lines.push(`fieldFailures: ${fieldFailures}`);
  }

  return lines.join("\n");
}

function isNarrativeResponse(value: unknown): value is NarrativeResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.summary !== "string" ||
    typeof candidate.recommendation !== "string" ||
    !Array.isArray(candidate.patterns)
  ) {
    return false;
  }

  return candidate.patterns.every(isNarrativePattern);
}

function isNarrativePattern(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.affectedCount === "number" &&
    Array.isArray(candidate.exampleIds) &&
    candidate.exampleIds.every((exampleId) => typeof exampleId === "string")
  );
}