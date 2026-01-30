import { inferType } from "./infer-type";
import { type JsonValue } from "./json-value";

export function generateTypeBody(obj: { [key: string]: JsonValue }, indent = "\t"): string {
  const closingIndent = indent.slice(0, -1) || "";

  const lines = Object.entries(obj).map(([key, value]) => {
    const type = inferType(value, indent + "\t");
    return `${indent}${key}: ${type};`;
  });

  return `{\n${lines.join("\n")}\n${closingIndent}}`;
}
