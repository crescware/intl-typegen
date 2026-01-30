import { existsSync, writeFileSync } from "node:fs";

import { configFilename } from "./config-filename";

const defaultConfig = `input: ./locales/en.json
output: ./src/generated
overwrite: false
`;

export function init(): void {
  if (existsSync(configFilename)) {
    console.error(`Error: ${configFilename} already exists`);
    process.exit(1);
  }

  writeFileSync(configFilename, defaultConfig);
  console.log(`Created ${configFilename}`);
}
