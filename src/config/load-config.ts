import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ValiError, parse } from "valibot";
import { parse as parseYaml } from "yaml";

import { UsageError } from "../errors/usage-error";
import { type Config, configSchema } from "./config";
import { configFilename } from "./config-filename";

export function loadConfig(): Config {
  if (!existsSync(configFilename)) {
    throw new UsageError(
      `Config file not found: ${configFilename}\nRun 'intl-typegen init' to create one.`,
    );
  }

  const content = readFileSync(configFilename, "utf-8");

  let rawConfig: unknown;
  try {
    rawConfig = parseYaml(content);
  } catch (e) {
    if (e instanceof Error) {
      throw new UsageError(`Invalid YAML in config file: ${configFilename}\n${e.message}`);
    }
    throw e;
  }

  let config: Config;
  try {
    config = parse(configSchema, rawConfig);
  } catch (e) {
    if (e instanceof ValiError) {
      const messages = e.issues.map((issue) => issue.message).join(", ");
      throw new UsageError(`Invalid config: ${messages}`);
    }
    throw e;
  }

  const configDir = dirname(resolve(configFilename));

  return {
    ...config,
    input: resolve(configDir, config.input),
    output: resolve(configDir, config.output),
  };
}
