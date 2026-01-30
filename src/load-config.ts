import { existsSync, readFileSync } from "node:fs";
import { parse } from "valibot";
import { parse as parseYaml } from "yaml";

import { type Config, configSchema } from "./config";
import { configFilename } from "./config-filename";
import { PreconditionError } from "./precondition-error";

export function loadConfig(): Config {
  if (!existsSync(configFilename)) {
    throw new PreconditionError(
      `Config file not found: ${configFilename}\nRun 'intl-typegen init' to create one.`,
    );
  }
  const content = readFileSync(configFilename, "utf-8");
  return parse(configSchema, parseYaml(content));
}
