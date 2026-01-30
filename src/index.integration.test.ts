import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { configFilename } from "./config/config-filename";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "..", "dist", "index.js");

describe("init", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "intl-typegen-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("should create config file", () => {
    execSync(`node ${cliPath} init`, { cwd: tempDir });

    const configPath = join(tempDir, configFilename);
    expect(existsSync(configPath)).toBe(true);
  });

  test("should write default content", () => {
    const expected = `input: ./locales/en.json
output: ./src/generated
overwrite: false
`;

    execSync(`node ${cliPath} init`, { cwd: tempDir });

    const configPath = join(tempDir, configFilename);
    const content = readFileSync(configPath, "utf-8");

    expect(content).toBe(expected);
  });
});
