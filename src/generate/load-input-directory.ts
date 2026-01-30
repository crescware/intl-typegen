import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "valibot";

import { PreconditionError } from "../precondition-error";
import { type Input, inputSchema } from "./input";

export interface LoadInputResult {
  data: Input;
  locales: string[];
}

export function loadInputDirectory(inputPath: string): LoadInputResult {
  if (!statSync(inputPath, { throwIfNoEntry: false })?.isDirectory()) {
    throw new PreconditionError(`Input directory not found: ${inputPath}`);
  }

  const files = readdirSync(inputPath).filter((file) => file.endsWith(".json"));

  if (files.length === 0) {
    throw new PreconditionError(`Input directory contains no JSON files: ${inputPath}`);
  }

  const locales: string[] = [];
  const merged: Input = {};
  const keySourceMap: Record<string, string> = {};

  for (const file of files) {
    const locale = file.replace(/\.json$/, "");
    locales.push(locale);

    const filepath = join(inputPath, file);
    const content = readFileSync(filepath, "utf-8");

    let json: unknown;
    try {
      json = JSON.parse(content);
    } catch {
      throw new PreconditionError(`Invalid JSON in file: ${filepath}`);
    }

    const parsed = parse(inputSchema, json);

    for (const [key, value] of Object.entries(parsed)) {
      if (keySourceMap[key]) {
        throw new PreconditionError(
          `Duplicate top-level key "${key}" found in ${file} and ${keySourceMap[key]}`,
        );
      }

      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new PreconditionError(`Top-level value for "${key}" must be an object in ${file}`);
      }

      keySourceMap[key] = file;
      merged[key] = value;
    }
  }

  return {
    data: merged,
    locales: locales.sort(),
  };
}
