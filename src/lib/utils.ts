import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SchemaField } from "./types";

/** Merges Tailwind class names, resolving conflicts via tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Maps a runtime value to its SchemaField type tag.
 * Used by schema inference, schema validation, and the row evaluator.
 */
export function getValueType(value: unknown): SchemaField["type"] {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === "object")
    return t;
  return "string";
}
