import { parseOutput } from "../evaluator/parse-output";
import type {
  FailureCluster,
  NarrativePattern,
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

/** Rows shown to the model as examples. */
const MAX_SAMPLED_ROWS = 20;
/** Clusters listed in the prompt; smaller ones are summarised as a count. */
const MAX_PROMPT_CLUSTERS = 40;
/** Example ids attached to each pattern. */
const EXAMPLES_PER_PATTERN = 3;

/**
 * Groups failed rows into one cluster per (field, reason) pair, largest first.
 *
 * The narrative is built on these clusters so that every count it shows is
 * computed over all failed rows, not guessed by the model from a sample.
 */
export function clusterFailures(rows: NarrativeRow[]): FailureCluster[] {
  const byKey = new Map<string, Omit<FailureCluster, "id">>();

  for (const row of rows) {
    const keysOnRow = new Set<string>();
    for (const failure of row.failures) {
      const key = `${failure.field}\u0000${failure.reason}`;
      if (keysOnRow.has(key)) continue;
      keysOnRow.add(key);

      const cluster = byKey.get(key);
      if (cluster) cluster.rowIds.push(row.id);
      else
        byKey.set(key, {
          field: failure.field,
          reason: failure.reason,
          rowIds: [row.id],
        });
    }
  }

  return [...byKey.values()]
    .sort(
      (a, b) =>
        b.rowIds.length - a.rowIds.length ||
        a.field.localeCompare(b.field) ||
        a.reason.localeCompare(b.reason),
    )
    .map((cluster, i) => ({ id: `C${i + 1}`, ...cluster }));
}

export function buildNarrativePrompt(
  request: NarrativeRequest,
  clusters: FailureCluster[] = clusterFailures(request.failedRows),
): string {
  const includePrompt = shouldIncludePrompt(request.failedRows);
  const sampledRows = sampleFailedRows(request.failedRows, clusters);
  const clustersByRow = clusterIdsByRow(clusters);

  const failureBreakdown = Object.entries(request.failureBreakdown)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reason, count]) => `- ${reason}: ${count}`)
    .join("\n");

  const listedClusters = clusters.slice(0, MAX_PROMPT_CLUSTERS);
  const clusterLines = listedClusters.map(
    (c) => `- ${c.id}: field "${c.field}", ${c.reason}, ${c.rowIds.length} rows`,
  );
  if (clusters.length > listedClusters.length) {
    clusterLines.push(
      `- (${clusters.length - listedClusters.length} smaller clusters not listed)`,
    );
  }

  const rowBlocks = sampledRows
    .map((row) =>
      formatRow(row, includePrompt, clustersByRow.get(row.id) ?? []),
    )
    .join("\n\n");

  return [
    "You are analyzing failures from an EvalLens evaluation run.",
    "Respond only with valid JSON. Do not use markdown, backticks, or any prose outside the JSON object.",
    "The JSON must match this TypeScript shape exactly:",
    '{"summary":"string","patterns":[{"title":"string","description":"string","clusterIds":["C1"]}],"recommendation":"string"}',
    "EvalLens has already grouped every failed row into exact clusters, one per field and failure reason (listed below).",
    "Each pattern must list the clusterIds it explains. EvalLens computes affected row counts and example row ids from those clusters, so do not state row counts or row ids yourself.",
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
    "Failure clusters:",
    clusterLines.join("\n") || "- none",
    "",
    `Representative failed rows (${sampledRows.length} of ${request.failedRows.length} shown):`,
    rowBlocks || "none",
  ].join("\n");
}

/**
 * Parses the model's answer and resolves each pattern's cluster ids into
 * exact counts and example ids. Patterns that cite no known cluster are
 * dropped and counted in `discardedPatterns`.
 *
 * @throws {NarrativeParseError} if the answer isn't JSON of the expected shape
 */
export function parseNarrativeResponse(
  raw: string,
  clusters: FailureCluster[],
): NarrativeResponse {
  const output = parseOutput(raw.trim());
  if (!output.ok) {
    throw new NarrativeParseError("Failed to parse narrative JSON", raw);
  }

  const parsed = output.value;
  if (!isRawNarrative(parsed)) {
    throw new NarrativeParseError(
      "Narrative response does not match expected shape",
      raw,
    );
  }

  const clustersById = new Map(clusters.map((c) => [c.id, c]));
  const patterns: NarrativePattern[] = [];
  let discarded = 0;

  for (const pattern of parsed.patterns) {
    const cited = [...new Set(pattern.clusterIds)]
      .map((id) => clustersById.get(id))
      .filter((c): c is FailureCluster => c !== undefined);

    if (cited.length === 0) {
      discarded++;
      continue;
    }

    const rowIds = [...new Set(cited.flatMap((c) => c.rowIds))];
    patterns.push({
      title: pattern.title,
      description: pattern.description,
      affectedCount: rowIds.length,
      exampleIds: rowIds.slice(0, EXAMPLES_PER_PATTERN),
      basis: cited.map((c) => ({
        field: c.field,
        reason: c.reason,
        count: c.rowIds.length,
      })),
    });
  }

  return {
    summary: parsed.summary,
    patterns,
    recommendation: parsed.recommendation,
    ...(discarded > 0 ? { discardedPatterns: discarded } : {}),
  };
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

/**
 * Picks example rows round-robin across clusters (largest first), so small
 * clusters still get an example once large ones have had theirs.
 */
function sampleFailedRows(
  rows: NarrativeRow[],
  clusters: FailureCluster[],
): NarrativeRow[] {
  if (rows.length <= MAX_SAMPLED_ROWS) {
    return rows;
  }

  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const selected: NarrativeRow[] = [];
  const seenIds = new Set<string>();
  const cursors = clusters.map(() => 0);

  let progressed = true;
  while (selected.length < MAX_SAMPLED_ROWS && progressed) {
    progressed = false;
    for (let c = 0; c < clusters.length; c++) {
      const ids = clusters[c].rowIds;
      while (cursors[c] < ids.length && seenIds.has(ids[cursors[c]])) {
        cursors[c]++;
      }
      if (cursors[c] >= ids.length) continue;

      const row = rowsById.get(ids[cursors[c]]);
      cursors[c]++;
      progressed = true;
      if (!row) continue;

      selected.push(row);
      seenIds.add(row.id);
      if (selected.length === MAX_SAMPLED_ROWS) break;
    }
  }

  return selected;
}

function clusterIdsByRow(clusters: FailureCluster[]): Map<string, string[]> {
  const byRow = new Map<string, string[]>();
  for (const cluster of clusters) {
    for (const rowId of cluster.rowIds) {
      const ids = byRow.get(rowId);
      if (ids) ids.push(cluster.id);
      else byRow.set(rowId, [cluster.id]);
    }
  }
  return byRow;
}

function formatRow(
  row: NarrativeRow,
  includePrompt: boolean,
  clusterIds: string[],
): string {
  const lines = [
    `id: ${row.id}`,
    ...(includePrompt && row.prompt ? [`prompt: ${row.prompt}`] : []),
    `expected: ${row.expected}`,
    `actual: ${row.actual}`,
    `failures: ${row.failures.map((f) => `${f.field} ${f.reason}`).join(", ")}`,
  ];

  if (clusterIds.length > 0) {
    lines.push(`clusters: ${clusterIds.join(", ")}`);
  }

  return lines.join("\n");
}

type RawNarrative = {
  summary: string;
  recommendation: string;
  patterns: { title: string; description: string; clusterIds: string[] }[];
};

function isRawNarrative(value: unknown): value is RawNarrative {
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

  return candidate.patterns.every(isRawPattern);
}

function isRawPattern(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    Array.isArray(candidate.clusterIds) &&
    candidate.clusterIds.every((id) => typeof id === "string")
  );
}
