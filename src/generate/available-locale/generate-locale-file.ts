import type { AvailableLocaleConfig } from "../../config/config";

import { PreconditionError } from "../../errors/precondition-error";
import { generateTypescriptLocaleFile } from "./generate-typescript-locale-file";
import { generateValibotLocaleFile } from "./generate-valibot-locale-file";
import { generateZodLocaleFile } from "./generate-zod-locale-file";

export function generateLocaleFile(locales: string[], config: AvailableLocaleConfig): string {
  switch (config.declaration) {
    case "typescript":
      return generateTypescriptLocaleFile(locales, config);

    case "valibot":
      return generateValibotLocaleFile(locales, config);

    case "zod":
      return generateZodLocaleFile(locales, config);

    default:
      throw new PreconditionError(`Unknown declaration: ${config.declaration}`);
  }
}
