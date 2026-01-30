import type { AvailableLocaleConfig } from "../../config/config";

import { generateTypescriptLocaleFile } from "./generate-typescript-locale-file";
import { generateValibotLocaleFile } from "./generate-valibot-locale-file";
import { generateZodLocaleFile } from "./generate-zod-locale-file";

export function generateLocaleFile(locales: string[], config: AvailableLocaleConfig): string {
  const { declaration, name, variableNameConvention } = config;

  switch (declaration) {
    case "typescript":
      return generateTypescriptLocaleFile(locales, name, variableNameConvention);
    case "valibot":
      return generateValibotLocaleFile(locales, name, variableNameConvention);
    case "zod":
      return generateZodLocaleFile(locales, name, variableNameConvention);
    default:
      return generateTypescriptLocaleFile(locales, name, variableNameConvention);
  }
}
