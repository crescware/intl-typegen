import { pascalCase } from "scule";

import { applyVariableNameConvention } from "./apply-variable-name-convention";

export function generateTypescriptLocaleFile(
  locales: string[],
  collectionName: string,
  variableNameConvention: string,
): string {
  const lines: string[] = [];

  for (const locale of locales) {
    const varName = applyVariableNameConvention(variableNameConvention, locale);
    lines.push(`export const ${varName} = "${locale}" as const;`);
  }

  lines.push("");

  const collectionVarName = applyVariableNameConvention(variableNameConvention, collectionName);
  const localeVarNames = locales.map((l) => applyVariableNameConvention(variableNameConvention, l));
  lines.push(`export const ${collectionVarName} = [${localeVarNames.join(", ")}] as const;`);

  lines.push("");

  const typeName = pascalCase(collectionName);
  lines.push(`export type ${typeName} = (typeof ${collectionVarName})[number];`);

  return lines.join("\n") + "\n";
}
