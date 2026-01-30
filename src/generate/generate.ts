import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadConfig } from "../config/load-config";
import { generateFile } from "./generate-file";
import { getOutputFilename } from "./get-output-filename";
import { loadInputDirectory } from "./load-input-directory";

export function generate(): void {
  const config = loadConfig();
  const { data: json } = loadInputDirectory(config.input);

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
