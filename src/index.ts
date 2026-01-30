#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { init } from "./config/init";
import { generate } from "./generate/generate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
const version: string = packageJson.version;

function main(): void {
  const program = new Command();

  program
    .name("intl-typegen")
    .description("Generate TypeScript files from i18n JSON translation files")
    .version(version);

  program.command("init").description("Create config file").action(init);
  program
    .command("generate", { isDefault: true })
    .description("Generate TypeScript files")
    .action(generate);

  program.parse();
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
