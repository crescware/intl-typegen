import { camelCase, pascalCase } from "scule";

export function applyVariableNameConvention(convention: string, localeName: string): string {
  const camelCaseName = camelCase(localeName);
  const pascalCaseName = pascalCase(localeName);

  if (convention.startsWith("{name}")) {
    return convention.replace("{name}", camelCaseName);
  }
  return convention.replace("{name}", pascalCaseName);
}
