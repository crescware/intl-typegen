import { existsSync, readFileSync } from "node:fs";
import { boolean, type InferOutput, object, parse, string } from "valibot";
import { parse as parseYaml } from "yaml";

import { configFilename } from "./config-filename";
import { PreconditionError } from "./precondition-error";

const configSchema = object({
  input: string(),
  output: string(),
  overwrite: boolean(),
});

export type Config = InferOutput<typeof configSchema>;

export function loadConfig(): Config {
  if (!existsSync(configFilename)) {
    throw new PreconditionError(
      `Config file not found: ${configFilename}\nRun 'intl-typegen init' to create one.`,
    );
  }
  const content = readFileSync(configFilename, "utf-8");
  return parse(configSchema, parseYaml(content));
}
