import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../config/load-config";
import { UsageError } from "../errors/usage-error";
import { generateFile } from "./generate-file";
import { generateLocaleFile } from "./generate-locale-file";
import { getOutputFilename } from "./get-output-filename";
import { loadInputDirectory } from "./load-input-directory";

function writeFile(filepath: string, content: string): void {
  try {
    writeFileSync(filepath, content);
  } catch (e) {
    if (e instanceof Error) {
      throw new UsageError(`Failed to write file: ${filepath}`, { cause: e });
    }
    throw e;
  }
}

export function generate(): void {
  const config = loadConfig();
  const { data: json, locales } = loadInputDirectory(config.input);

  if (!existsSync(config.output)) {
    try {
      mkdirSync(config.output, { recursive: true });
    } catch (e) {
      if (e instanceof Error) {
        throw new UsageError(`Failed to create output directory: ${config.output}`, { cause: e });
      }
      throw e;
    }
  }

  // Generate available-locale.ts
  const localeFilename = "available-locale.ts";
  const localeFilepath = join(config.output, localeFilename);

  if (existsSync(localeFilepath) && !config.overwrite) {
    console.warn(`Skipping ${localeFilename}: file already exists`);
  } else {
    const localeContent = generateLocaleFile(locales, config.availableLocale);
    writeFile(localeFilepath, localeContent);
    console.log(`Generated ${localeFilename}`);
  }

  // Generate translation files
  for (const [key, value] of Object.entries(json)) {
    const filename = getOutputFilename(key);
    const filepath = join(config.output, filename);

    if (existsSync(filepath) && !config.overwrite) {
      console.warn(`Skipping ${filename}: file already exists`);
      continue;
    }

    const content = generateFile(key, value);
    writeFile(filepath, content);
    console.log(`Generated ${filename}`);
  }
}
