import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { IgnoredProperty } from "./translation/analyze-rich-keys";

import { loadConfig } from "../config/load-config";
import { UsageError } from "../errors/usage-error";
import { generateLocaleFile } from "./available-locale/generate-locale-file";
import { getOutputFilename } from "./get-output-filename";
import { loadInputDirectory } from "./load-input-directory";
import { generateFile } from "./translation/generate-file";

export type GenerateOptions = {
  dryRun: boolean;
};

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

function printFilePreview(filename: string, content: string, action: "create" | "overwrite"): void {
  const header = action === "overwrite" ? `[overwrite] ${filename}` : filename;
  console.log(header);
  console.log("---");
  console.log(content);
}

export function generate({ dryRun }: GenerateOptions): void {
  const config = loadConfig();
  const { data: json, locales } = loadInputDirectory(config.input);

  if (!dryRun && !existsSync(config.output)) {
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
  const localeExists = existsSync(localeFilepath);

  if (localeExists && !config.overwrite) {
    console.warn(`Skipping ${localeFilename}: file already exists`);
  } else {
    const localeContent = generateLocaleFile(locales, config.availableLocale);
    if (dryRun) {
      printFilePreview(localeFilename, localeContent, localeExists ? "overwrite" : "create");
    } else {
      writeFile(localeFilepath, localeContent);
      console.log(`Generated ${localeFilename}`);
    }
  }

  // Generate translation files
  const allWarnings: string[] = [];
  const allIgnoredProperties: IgnoredProperty[] = [];

  for (const [key, value] of Object.entries(json)) {
    const filename = getOutputFilename(key);
    const filepath = join(config.output, filename);
    const fileExists = existsSync(filepath);

    if (fileExists && !config.overwrite) {
      console.warn(`Skipping ${filename}: file already exists`);
      continue;
    }

    const { content, warnings, ignoredProperties } = generateFile(key, value);
    allWarnings.push(...warnings);
    allIgnoredProperties.push(...ignoredProperties);

    if (dryRun) {
      printFilePreview(filename, content, fileExists ? "overwrite" : "create");
    } else {
      writeFile(filepath, content);
      console.log(`Generated ${filename}`);
    }
  }

  // Display report
  if (allIgnoredProperties.length > 0) {
    console.warn("\nIgnored properties:");
    for (const { key, reason } of allIgnoredProperties) {
      console.warn(`  - "${key}": ${reason}`);
    }
  }

  if (allWarnings.length > 0) {
    console.warn("\nWarnings:");
    for (const warning of allWarnings) {
      console.warn(`  - ${warning}`);
    }
  }
}
