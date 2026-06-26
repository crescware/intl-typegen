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
import { type JsonValue } from "./translation/json-value";

export interface LoadInputResult {
  data: Input;
  /**
   * Every locale's object for each namespace, keyed by namespace. Unlike `data`
   * (a single merged structure), this keeps each locale's messages intact so
   * rich() tags can be unioned across locales during type generation.
   */
  localeMessages: Record<string, Record<string, JsonValue>[]>;
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
  const localeMessages: Record<string, Record<string, JsonValue>[]> = {};
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

    for (const [namespace, value] of Object.entries(parsed)) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new UsageError(`Top-level value for "${namespace}" must be an object in ${file}`);
      }

      // Keep every locale's object so rich() tags can later be unioned across
      // locales: a tag present in only one locale must still reach the type.
      const variants = localeMessages[namespace];
      if (variants === undefined) {
        localeMessages[namespace] = [value];
      } else {
        variants.push(value);
      }

      // Build the dictionary structure as the union of keys across all locales,
      // taking each key's value from the first locale that defines it. A fresh
      // object is used so the per-locale objects in `localeMessages` stay intact.
      const target = merged[namespace];
      if (target === undefined) {
        merged[namespace] = { ...value };
      } else {
        for (const [key, keyValue] of Object.entries(value)) {
          if (!(key in target)) {
            target[key] = keyValue;
          }
        }
      }
    }
  }

  return {
    data: merged,
    localeMessages,
    locales,
    keyDiscrepancies: findKeyDiscrepancies(localeFileKeys),
  };
}
