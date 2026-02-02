import { pascalCase } from "scule";

import type { AvailableLocaleConfig } from "../../config/config";

import { applyVariableNameConvention } from "./apply-variable-name-convention";

export function generateTypescriptLocaleFile(
  locales: string[],
  { name, variableNameConvention }: Pick<AvailableLocaleConfig, "name" | "variableNameConvention">,
): string {
  const lines: string[] = [];

  for (const locale of locales) {
    const varName = applyVariableNameConvention(variableNameConvention, locale);
    lines.push(`export const ${varName} = "${locale}" as const;`);
  }

  lines.push("");

  const collectionVarName = applyVariableNameConvention(variableNameConvention, name);
  const localeVarNames = locales.map((l) => applyVariableNameConvention(variableNameConvention, l));
  lines.push(`export const ${collectionVarName} = [${localeVarNames.join(", ")}] as const;`);

  lines.push("");

  const typeName = pascalCase(name);
  lines.push(`export type ${typeName} = (typeof ${collectionVarName})[number];`);

  return lines.join("\n") + "\n";
}
