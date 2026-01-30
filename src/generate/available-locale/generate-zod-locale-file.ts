import { pascalCase } from "scule";

import { applyVariableNameConvention } from "./apply-variable-name-convention";

export function generateZodLocaleFile(
  locales: string[],
  collectionName: string,
  variableNameConvention: string,
): string {
  const lines: string[] = [];

  lines.push('import { z } from "zod";');
  lines.push("");

  for (const locale of locales) {
    const varName = applyVariableNameConvention(variableNameConvention, locale);
    lines.push(`export const ${varName} = z.literal("${locale}");`);
  }

  lines.push("");

  const collectionVarName = applyVariableNameConvention(variableNameConvention, collectionName);
  const localeVarNames = locales.map((l) => applyVariableNameConvention(variableNameConvention, l));
  lines.push(`export const ${collectionVarName} = z.union([${localeVarNames.join(", ")}]);`);

  lines.push("");

  const typeName = pascalCase(collectionName);
  lines.push(`export type ${typeName} = z.infer<typeof ${collectionVarName}>;`);

  return lines.join("\n") + "\n";
}
