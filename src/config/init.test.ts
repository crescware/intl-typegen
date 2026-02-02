import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { packageDirectorySync } from "package-directory";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { assertExists } from "../errors/assert-exists";
import { configFilename } from "./config-filename";

const packageRoot = packageDirectorySync();
assertExists(packageRoot);
const cliPath = resolve(packageRoot, "dist", "index.js");

describe("init()", () => {
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
    const expected = `input: ./messages
output: ./src/generated
overwrite: false
`;

    execSync(`node ${cliPath} init`, { cwd: tempDir });

    const configPath = join(tempDir, configFilename);
    const content = readFileSync(configPath, "utf-8");

    expect(content).toBe(expected);
  });
});
