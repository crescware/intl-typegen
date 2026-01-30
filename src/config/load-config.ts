import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { type InferOutput, ValiError, parse } from "valibot";
import { parse as parseYaml } from "yaml";

import { UsageError } from "../errors/usage-error";
import {
  type AvailableLocaleConfig,
  availableLocaleConfigDefaults,
  type Config,
  configSchema,
} from "./config";
import { configFilename } from "./config-filename";

export function loadConfig(): Config {
  if (!existsSync(configFilename)) {
    throw new UsageError(
      [`Config file not found: ${configFilename}`, "Run 'intl-typegen init' to create one."].join(
        "\n",
      ),
    );
  }

  const content = readFileSync(configFilename, "utf-8");

  let rawConfig: unknown;
  try {
    rawConfig = parseYaml(content);
  } catch (e) {
    if (e instanceof Error) {
      throw new UsageError(`Invalid YAML in config file: ${configFilename}`, { cause: e });
    }
    throw e;
  }

  let config: InferOutput<typeof configSchema>;
  try {
    config = parse(configSchema, rawConfig);
  } catch (e) {
    if (e instanceof ValiError) {
      throw new UsageError(`Invalid config: ${configFilename}`, { cause: e });
    }
    throw e;
  }

  const configDir = dirname(resolve(configFilename));

  const availableLocale = {
    declaration: config.availableLocale?.declaration ?? availableLocaleConfigDefaults.declaration,
    name: config.availableLocale?.name ?? availableLocaleConfigDefaults.name,
    variableNameConvention:
      config.availableLocale?.variableNameConvention ??
      availableLocaleConfigDefaults.variableNameConvention,
  } satisfies AvailableLocaleConfig;

  return {
    ...config,
    input: resolve(configDir, config.input),
    output: resolve(configDir, config.output),
    availableLocale: availableLocale,
  };
}
