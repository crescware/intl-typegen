import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "valibot";

import { loadConfig } from "../config/load-config";
import { generateFile, getOutputFilename, inputSchema } from "./generator";

export function generate(): void {
  const config = loadConfig();
  const inputContent = readFileSync(config.input, "utf-8");
  const json = parse(inputSchema, JSON.parse(inputContent));

  if (!existsSync(config.output)) {
    mkdirSync(config.output, { recursive: true });
  }

  for (const [key, value] of Object.entries(json)) {
    const filename = getOutputFilename(key);
    const filepath = join(config.output, filename);

    if (existsSync(filepath) && !config.overwrite) {
      console.warn(`Skipping ${filename}: file already exists`);
      continue;
    }

    const content = generateFile(key, value);
    writeFileSync(filepath, content);
    console.log(`Generated ${filename}`);
  }
}
