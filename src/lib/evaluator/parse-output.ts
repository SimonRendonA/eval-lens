/**
 * Output parsing for the `actual` column.
 *
 * Models often return valid JSON wrapped in a markdown fence or a sentence of
 * prose. A strict parser rejects that, and the evaluator still reports it as a
 * failure (`WRAPPED_JSON`), but recovering the JSON lets the content be
 * evaluated too — so a format problem is not mistaken for a content problem.
 */

export type ParsedOutput =
  | { ok: true; value: unknown; wrapper: null }
  | { ok: true; value: unknown; wrapper: "fence" | "prose" }
  | { ok: false };

const FENCE_PATTERN = /```[a-zA-Z0-9_-]*[^\S\n]*\n?([\s\S]*?)```/;

/** Upper bound on candidate `{` positions tried when scanning prose. */
const MAX_PROSE_CANDIDATES = 20;

/**
 * Parses model output, recovering JSON from markdown fences or prose.
 *
 * Order: strict `JSON.parse`, then the first fenced block, then the first
 * balanced `{...}` span that parses. Only a strict parse returns `wrapper: null`.
 */
export function parseOutput(text: string): ParsedOutput {
  const strict = tryParse(text);
  if (strict.ok) return { ok: true, value: strict.value, wrapper: null };

  const fence = FENCE_PATTERN.exec(text);
  if (fence) {
    const fenced = tryParse(fence[1]);
    if (fenced.ok) return { ok: true, value: fenced.value, wrapper: "fence" };
  }

  const embedded = extractEmbeddedObject(text);
  if (embedded.ok) return { ok: true, value: embedded.value, wrapper: "prose" };

  return { ok: false };
}

function tryParse(text: string): { ok: true; value: unknown } | { ok: false } {
  if (text.trim() === "") return { ok: false };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/**
 * Finds the first `{` that starts a balanced, parseable JSON object.
 * Brace matching skips characters inside JSON string literals.
 */
function extractEmbeddedObject(
  text: string,
): { ok: true; value: unknown } | { ok: false } {
  let start = text.indexOf("{");
  let attempts = 0;

  while (start !== -1 && attempts < MAX_PROSE_CANDIDATES) {
    attempts++;
    const end = findMatchingBrace(text, start);
    if (end !== -1) {
      const candidate = tryParse(text.slice(start, end + 1));
      if (candidate.ok) return candidate;
    }
    start = text.indexOf("{", start + 1);
  }

  return { ok: false };
}

function findMatchingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (char === "\\") i++;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}
