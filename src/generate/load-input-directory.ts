import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "valibot";

import { UsageError } from "../errors/usage-error";
import {
  findKeyDiscrepancies,
  type KeyDiscrepancy,
  type LocaleFileKeys,
} from "./check-locale-key-consistency";
import { collectKeyLines } from "./collect-key-lines";
import { type Input, inputSchema } from "./input";

export interface LoadInputResult {
  data: Input;
  locales: string[];
  keyDiscrepancies: KeyDiscrepancy[];
}

export function loadInputDirectory(inputPath: string): LoadInputResult {
  if (!statSync(inputPath, { throwIfNoEntry: false })?.isDirectory()) {
    throw new UsageError(`Input directory not found: ${inputPath}`);
  }

  const files = readdirSync(inputPath)
    .filter((file) => file.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    throw new UsageError(`Input directory contains no JSON files: ${inputPath}`);
  }

  const locales: string[] = [];
  // Each file is a locale; top-level keys are namespaces shared across locales.
  // The same namespace appearing in multiple locale files is expected, not a conflict.
  const merged: Input = {};
  const localeFileKeys: LocaleFileKeys[] = [];

  for (const file of files) {
    const locale = file.replace(/\.json$/, "");
    locales.push(locale);

    const filepath = join(inputPath, file);
    const content = readFileSync(filepath, "utf-8");

    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      throw new UsageError(`Invalid JSON in file: ${filepath}`);
    }

    const parsed = parse(inputSchema, json);
    localeFileKeys.push({ file, keyLines: collectKeyLines(content) });

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new UsageError(`Top-level value for "${key}" must be an object in ${file}`);
      }

      // Generate the namespace type from the first locale that defines it.
      // Subsequent locales are assumed to share the same structure.
      if (key in merged) {
        continue;
      }

      merged[key] = value;
    }
  }

  return {
    data: merged,
    locales,
    keyDiscrepancies: findKeyDiscrepancies(localeFileKeys),
  };
}
