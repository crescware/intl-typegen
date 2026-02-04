import { pascalCase } from "scule";

import { analyzeRichKeys, type IgnoredProperty, type RichKeys } from "./analyze-rich-keys";
import { generateTypeBody } from "./generate-type-body";
import { type JsonValue } from "./json-value";

export type GenerateFileResult = Readonly<{
  content: string;
  warnings: readonly string[];
  ignoredProperties: readonly IgnoredProperty[];
}>;

function filterValidValues(obj: Record<string, JsonValue>): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = value;
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = value;
    }
  }
  return result;
}

function generateImports(hasRichKeys: boolean): string {
  const lines = ['import { useTranslations } from "next-intl";'];

  if (hasRichKeys) {
    lines.push('import type { ReactElement, ReactNode } from "react";');
    lines.push('import type { DeepReadonly, StrictExtract } from "ts-essentials";');
  } else {
    lines.push('import type { DeepReadonly } from "ts-essentials";');
  }

  return lines.join("\n");
}

function generateRichSignature<T extends string>(
  richKeys: RichKeys<T>,
  dictionaryName: string,
  indent: string,
): string {
  const keysWithTags = Object.entries(richKeys).filter(
    ([, tags]) => (tags as readonly string[]).length > 0,
  );

  if (keysWithTags.length === 0) {
    return "";
  }

  const signatures = keysWithTags.map(([key, tags]) => {
    const tagsList = tags as readonly string[];
    const optionsProperties = tagsList
      .map((tag) => `${indent}\t\t${tag}: (chunk: ReactNode) => ReactElement;`)
      .join("\n");

    return `${indent}rich(
${indent}\tkey: StrictExtract<keyof ${dictionaryName}, "${key}">,
${indent}\toptions: {
${optionsProperties}
${indent}\t},
${indent}): ReactNode;`;
  });

  return signatures.join("\n");
}

export function generateFile(
  name: string,
  obj: Record<string, JsonValue>,
): GenerateFileResult {
  const { richKeys, warnings, ignoredProperties } = analyzeRichKeys(obj);

  const keysWithTags = Object.entries(richKeys).filter(
    ([, tags]) => tags.length > 0,
  );
  const hasRichKeys = keysWithTags.length > 0;

  const pascalName = pascalCase(name);
  const dictionaryName = `${pascalName}Dictionary`;
  const translationsName = `${pascalName}Translations`;
  const functionName = `use${pascalName}Translations`;

  const imports = generateImports(hasRichKeys);

  const validValues = filterValidValues(obj);
  const typeBody = generateTypeBody(validValues);

  const richSignature = generateRichSignature(richKeys, dictionaryName, "\t");
  const richPart = richSignature ? `\n${richSignature}` : "";

  const content = `${imports}

type ${dictionaryName} = DeepReadonly<${typeBody}>;

type ${translationsName} = {
\t(key: keyof ${dictionaryName}): string;${richPart}
};

export function ${functionName}(): ${translationsName} {
\treturn useTranslations("${name}");
}
`;

  return { content, warnings, ignoredProperties };
}
