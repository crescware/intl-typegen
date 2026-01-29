#!/usr/bin/env node

import { existsSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { configFilename } from "./config-filename";

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
	const { positionals } = parseArgs({
		allowPositionals: true,
	});

	const command = positionals[0];

	switch (command) {
		case "init":
			init();
			break;
		case undefined:
			console.error("Usage: intl-typegen <command>");
			console.error("Commands:");
			console.error("  init    Create config file");
			process.exit(1);
			break;
		default:
			console.error(`Unknown command: ${command}`);
			process.exit(1);
	}
}

main();
