import { kebabCase, pascalCase } from "scule";
import {
  array,
  boolean,
  type GenericSchema,
  type InferOutput,
  lazy,
  null as null_,
  number,
  record,
  string,
  union,
} from "valibot";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema: GenericSchema<JsonValue> = union([
  string(),
  number(),
  boolean(),
  null_(),
  array(lazy(() => jsonValueSchema)),
  record(
    string(),
    lazy(() => jsonValueSchema),
  ),
]);

export const inputSchema = record(string(), record(string(), jsonValueSchema));

export type Input = InferOutput<typeof inputSchema>;

function inferType(value: JsonValue, indent: string): string {
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

function generateTypeBody(obj: { [key: string]: JsonValue }, indent = "\t"): string {
  const closingIndent = indent.slice(0, -1) || "";
  const lines = Object.entries(obj).map(([key, value]) => {
    const type = inferType(value, indent + "\t");
    return `${indent}${key}: ${type};`;
  });
  return `{\n${lines.join("\n")}\n${closingIndent}}`;
}

export function generateFile(name: string, obj: { [key: string]: JsonValue }): string {
  const pascalName = pascalCase(name);
  const typeName = `${pascalName}Dictionary`;
  const functionName = `use${pascalName}Translation`;
  const typeBody = generateTypeBody(obj);

  return `type ${typeName} = ${typeBody}

function ${functionName}() { /* TODO */ }
`;
}

export function getOutputFilename(name: string): string {
  return `use-${kebabCase(name)}-translation.ts`;
}
