import { pascalCase } from "scule";

import { generateTypeBody } from "./generate-type-body";
import { type JsonValue } from "./json-value";

export function generateFile(name: string, obj: { [key: string]: JsonValue }): string {
  const pascalName = pascalCase(name);
  const typeName = `${pascalName}Dictionary`;
  const functionName = `use${pascalName}Translation`;
  const typeBody = generateTypeBody(obj);

  return `type ${typeName} = ${typeBody}

function ${functionName}() { /* TODO */ }
`;
}
