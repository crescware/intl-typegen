import { existsSync, writeFileSync } from "node:fs";

import { configFilename } from "./config-filename";

const defaultConfig = `input: ./locales/en.json
output: ./src/generated
overwrite: false
`;

export function init(): void {
  if (existsSync(configFilename)) {
    throw new Error(`${configFilename} already exists`);
  }

  writeFileSync(configFilename, defaultConfig);
  console.log(`Created ${configFilename}`);
}
