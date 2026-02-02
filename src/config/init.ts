import { existsSync, writeFileSync } from "node:fs";

import { UsageError } from "../errors/usage-error";
import { configFilename } from "./config-filename";

const defaultConfig = `input: ./messages
output: ./src/generated
overwrite: false
`;

export function init(): void {
  if (existsSync(configFilename)) {
    throw new UsageError(`${configFilename} already exists`);
  }

  try {
    writeFileSync(configFilename, defaultConfig);
  } catch (e) {
    if (e instanceof Error) {
      throw new UsageError(`Failed to write config file: ${configFilename}`, { cause: e });
    }
    throw e;
  }

  console.log(`Created ${configFilename}`);
}
