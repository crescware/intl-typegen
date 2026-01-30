import { pascalCase } from "scule";

import type { AvailableLocaleConfig } from "../../config/config";

import { applyVariableNameConvention } from "./apply-variable-name-convention";

export function generateZodLocaleFile(
  locales: string[],
  { name, variableNameConvention }: Pick<AvailableLocaleConfig, "name" | "variableNameConvention">,
): string {
  const lines: string[] = [];

  lines.push('import { z } from "zod";');
  lines.push("");

  for (const locale of locales) {
    const varName = applyVariableNameConvention(variableNameConvention, locale);
    lines.push(`export const ${varName} = z.literal("${locale}");`);
  }

  lines.push("");

  const collectionVarName = applyVariableNameConvention(variableNameConvention, name);
  const localeVarNames = locales.map((l) => applyVariableNameConvention(variableNameConvention, l));
  lines.push(`export const ${collectionVarName} = z.union([${localeVarNames.join(", ")}]);`);

  lines.push("");

  const typeName = pascalCase(name);
  lines.push(`export type ${typeName} = z.infer<typeof ${collectionVarName}>;`);

  return lines.join("\n") + "\n";
}
