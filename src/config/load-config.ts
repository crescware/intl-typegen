import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parse } from "valibot";
import { parse as parseYaml } from "yaml";

import { PreconditionError } from "../precondition-error";
import { type Config, configSchema } from "./config";
import { configFilename } from "./config-filename";

export function loadConfig(): Config {
  if (!existsSync(configFilename)) {
    throw new PreconditionError(
      `Config file not found: ${configFilename}\nRun 'intl-typegen init' to create one.`,
    );
  }
  const content = readFileSync(configFilename, "utf-8");
  const config = parse(configSchema, parseYaml(content));

  const configDir = dirname(resolve(configFilename));

  return {
    ...config,
    input: resolve(configDir, config.input),
    output: resolve(configDir, config.output),
  };
}
