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

/** True for a non-null, non-array object — the only valid shape for a row output. */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Own-property check. Unlike the `in` operator it ignores inherited keys, so a
 * field named `constructor` or `toString` is not "present" on every object.
 */
export function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
