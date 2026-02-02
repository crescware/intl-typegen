import { inferType } from "./infer-type";
import { type JsonValue } from "./json-value";

const validIdentifierPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * Checks if a key is a valid TypeScript identifier.
 * If not, it needs to be quoted in type definitions.
 */
function isValidIdentifier(key: string): boolean {
  return validIdentifierPattern.test(key);
}

/**
 * Formats a key for use in a TypeScript type definition.
 * Quotes the key if it's not a valid identifier.
 */
function formatKey(key: string): string {
  if (isValidIdentifier(key)) {
    return key;
  }
  return `"${key.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Generates a TypeScript type body from a JSON object.
 *
 * Note: JSON keys are used directly without identifier sanitization because:
 * - Reserved words (e.g., `class`, `function`) are valid property names in TypeScript/JavaScript.
 *   `JSON.parse('{"class":"value"}')` produces `{ class: "value" }`, accessible via `obj.class`.
 * - Keys with invalid identifier characters (hyphens, spaces) or leading digits are quoted
 *   in the type definition to match the runtime object structure from `JSON.parse()`.
 */
export function generateTypeBody(obj: { [key: string]: JsonValue }, indent = "\t"): string {
  const closingIndent = indent.slice(0, -1) || "";

  const lines = Object.entries(obj).map(([key, value]) => {
    const type = inferType(value, indent + "\t");
    return `${indent}${formatKey(key)}: ${type};`;
  });

  return `{\n${lines.join("\n")}\n${closingIndent}}`;
}
