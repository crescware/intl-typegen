import { inferType } from "./infer-type";
import { type JsonValue } from "./json-value";

/**
 * Generates a TypeScript type body from a JSON object.
 *
 * Note: JSON keys are used directly without identifier sanitization because:
 * - Reserved words (e.g., `class`, `function`) are valid property names in TypeScript/JavaScript.
 *   `JSON.parse('{"class":"value"}')` produces `{ class: "value" }`, accessible via `obj.class`.
 * - Keys with invalid identifier characters (hyphens, spaces) or leading digits should be quoted
 *   in the type definition to match the runtime object structure from `JSON.parse()`.
 */
export function generateTypeBody(obj: { [key: string]: JsonValue }, indent = "\t"): string {
  const closingIndent = indent.slice(0, -1) || "";

  const lines = Object.entries(obj).map(([key, value]) => {
    const type = inferType(value, indent + "\t");
    return `${indent}${key}: ${type};`;
  });

  return `{\n${lines.join("\n")}\n${closingIndent}}`;
}
