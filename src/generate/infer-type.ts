import { generateTypeBody } from "./generate-type-body";
import { type JsonValue } from "./json-value";

export function inferType(value: JsonValue, indent: string): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    const first = value[0];
    if (first === undefined) {
      return "unknown[]";
    }
    const itemType = inferType(first, indent);
    return `${itemType}[]`;
  }
  if (typeof value === "object") {
    return generateTypeBody(value, indent);
  }
  return typeof value;
}
