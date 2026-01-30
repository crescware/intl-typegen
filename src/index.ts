#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { configFilename } from "./config-filename";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
const version: string = packageJson.version;

const DEFAULT_CONFIG = `input: ./locales/en.json
output: ./src/generated
overwrite: false
`;

function init(): void {
	if (existsSync(configFilename)) {
		console.error(`Error: ${configFilename} already exists`);
		process.exit(1);
	}

	writeFileSync(configFilename, DEFAULT_CONFIG);
	console.log(`Created ${configFilename}`);
}

function main(): void {
	const program = new Command();

	program
		.name("intl-typegen")
		.description("Generate TypeScript files from i18n JSON translation files")
		.version(version);

	program
		.command("init")
		.description("Create config file")
		.action(init);

	program.parse();
}

main();
