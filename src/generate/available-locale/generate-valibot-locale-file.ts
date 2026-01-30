import { pascalCase } from "scule";

import type { AvailableLocaleConfig } from "../../config/config";

import { applyVariableNameConvention } from "./apply-variable-name-convention";

export function generateValibotLocaleFile(
  locales: string[],
  { name, variableNameConvention }: Pick<AvailableLocaleConfig, "name" | "variableNameConvention">,
): string {
  const lines: string[] = [];

  lines.push('import { type InferOutput, literal, picklist } from "valibot";');
  lines.push("");

  for (const locale of locales) {
    const varName = applyVariableNameConvention(variableNameConvention, locale);
    lines.push(`export const ${varName} = literal("${locale}");`);
  }

  lines.push("");

  const collectionVarName = applyVariableNameConvention(variableNameConvention, name);
  const localeVarNames = locales.map((l) => applyVariableNameConvention(variableNameConvention, l));
  const literals = localeVarNames.map((v) => `${v}.literal`).join(", ");
  lines.push(`export const ${collectionVarName} = picklist([${literals}]);`);

  lines.push("");

  const typeName = pascalCase(name);
  lines.push(`export type ${typeName} = InferOutput<typeof ${collectionVarName}>;`);

  return lines.join("\n") + "\n";
}
