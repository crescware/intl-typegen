import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { packageDirectorySync } from "package-directory";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { assertExists } from "../errors/assert-exists";

const packageRoot = packageDirectorySync();
assertExists(packageRoot);
const cliPath = resolve(packageRoot, "dist", "index.js");
const fixturesPath = resolve(packageRoot, "test", "fixtures");

describe("generate()", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "intl-typegen-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("basic", () => {
    test("should generate files for flat key-value pairs", () => {
      const fixturePath = join(fixturesPath, "basic");
      cpSync(fixturePath, tempDir, { recursive: true });

      execSync(`node ${cliPath} generate`, { cwd: tempDir });

      const expectedAaa = readFileSync(
        join(tempDir, "expected", "use-aaa-translation.ts"),
        "utf-8",
      );
      const actualAaa = readFileSync(join(tempDir, "output", "use-aaa-translation.ts"), "utf-8");
      expect(actualAaa).toBe(expectedAaa);

      const expectedFooBar = readFileSync(
        join(tempDir, "expected", "use-foo-bar-translation.ts"),
        "utf-8",
      );
      const actualFooBar = readFileSync(
        join(tempDir, "output", "use-foo-bar-translation.ts"),
        "utf-8",
      );
      expect(actualFooBar).toBe(expectedFooBar);
    });
  });

  describe("nested", () => {
    test("should generate nested type definitions", () => {
      const fixturePath = join(fixturesPath, "nested");
      cpSync(fixturePath, tempDir, { recursive: true });

      execSync(`node ${cliPath} generate`, { cwd: tempDir });

      const expected = readFileSync(join(tempDir, "expected", "use-bbb-translation.ts"), "utf-8");
      const actual = readFileSync(
        join(tempDir, "generated", "types", "use-bbb-translation.ts"),
        "utf-8",
      );
      expect(actual).toBe(expected);
    });
  });

  describe("types", () => {
    test("should infer correct types for various values", () => {
      const fixturePath = join(fixturesPath, "types");
      cpSync(fixturePath, tempDir, { recursive: true });

      execSync(`node ${cliPath} generate`, { cwd: tempDir });

      const expected = readFileSync(join(tempDir, "expected", "use-mixed-translation.ts"), "utf-8");
      const actual = readFileSync(join(tempDir, "output", "use-mixed-translation.ts"), "utf-8");
      expect(actual).toBe(expected);
    });
  });

  describe("overwrite-false", () => {
    test("should skip existing files when overwrite is false", () => {
      const fixturePath = join(fixturesPath, "overwrite-false");
      cpSync(fixturePath, tempDir, { recursive: true });

      const existingContent = readFileSync(
        join(tempDir, "existing", "use-aaa-translation.ts"),
        "utf-8",
      );

      execSync(`node ${cliPath} generate`, { cwd: tempDir });

      const afterContent = readFileSync(
        join(tempDir, "existing", "use-aaa-translation.ts"),
        "utf-8",
      );
      expect(afterContent).toBe(existingContent);

      expect(existsSync(join(tempDir, "existing", "use-bbb-translation.ts"))).toBe(true);
    });
  });

  describe("dry-run", () => {
    test("should preview files without writing to disk", () => {
      const fixturePath = join(fixturesPath, "basic");
      cpSync(fixturePath, tempDir, { recursive: true });

      const output = execSync(`node ${cliPath} generate --dry-run`, {
        cwd: tempDir,
        encoding: "utf-8",
      });

      const expected = [
        "available-locale.ts",
        "---",
        'export const en = "en" as const;',
        "",
        "export const availableLocale = [en] as const;",
        "",
        "export type AvailableLocale = (typeof availableLocale)[number];",
        "",
        "use-aaa-translation.ts",
        "---",
        "export type AaaDictionary = {",
        "\ta1: string;",
        "\ta2: string;",
        "}",
        "",
        "export function useAaaTranslation() { /* TODO */ }",
        "",
        "use-foo-bar-translation.ts",
        "---",
        "export type FooBarDictionary = {",
        "\tfoo: string;",
        "}",
        "",
        "export function useFooBarTranslation() { /* TODO */ }",
        "",
        "",
      ].join("\n");

      expect(output).toEqual(expected);

      // Verify no files were written
      expect(existsSync(join(tempDir, "output"))).toBe(false);
    });

    test("should work with -n short flag", () => {
      const fixturePath = join(fixturesPath, "basic");
      cpSync(fixturePath, tempDir, { recursive: true });

      const outputLong = execSync(`node ${cliPath} generate --dry-run`, {
        cwd: tempDir,
        encoding: "utf-8",
      });

      const outputShort = execSync(`node ${cliPath} generate -n`, {
        cwd: tempDir,
        encoding: "utf-8",
      });

      // Same output as --dry-run
      expect(outputShort).toEqual(outputLong);

      // Verify no files were written
      expect(existsSync(join(tempDir, "output"))).toBe(false);
    });
  });

  describe("special keys", () => {
    test("should handle reserved words as JSON keys", () => {
      mkdirSync(join(tempDir, "messages"));
      writeFileSync(
        join(tempDir, "messages", "en.json"),
        JSON.stringify({ reserved: { class: "value", function: "value", if: "value" } }),
      );
      writeFileSync(
        join(tempDir, "intl-typegen.config.yaml"),
        ["input: ./messages", "output: ./output", "overwrite: true"].join("\n"),
      );

      execSync(`node ${cliPath} generate`, { cwd: tempDir });

      const actual = readFileSync(join(tempDir, "output", "use-reserved-translation.ts"), "utf-8");
      const expected = [
        "export type ReservedDictionary = {",
        "\tclass: string;",
        "\tfunction: string;",
        "\tif: string;",
        "}",
        "",
        "export function useReservedTranslation() { /* TODO */ }",
        "",
      ].join("\n");
      expect(actual).toEqual(expected);
    });

    test("should handle kebab-case keys", () => {
      mkdirSync(join(tempDir, "messages"));
      writeFileSync(
        join(tempDir, "messages", "en.json"),
        JSON.stringify({ kebab: { "foo-bar": "value", "hello-world": "value" } }),
      );
      writeFileSync(
        join(tempDir, "intl-typegen.config.yaml"),
        ["input: ./messages", "output: ./output", "overwrite: true"].join("\n"),
      );

      execSync(`node ${cliPath} generate`, { cwd: tempDir });

      const actual = readFileSync(join(tempDir, "output", "use-kebab-translation.ts"), "utf-8");
      const expected = [
        "export type KebabDictionary = {",
        "\tfoo-bar: string;",
        "\thello-world: string;",
        "}",
        "",
        "export function useKebabTranslation() { /* TODO */ }",
        "",
      ].join("\n");
      expect(actual).toEqual(expected);
    });

    test("should handle keys starting with numbers", () => {
      mkdirSync(join(tempDir, "messages"));
      writeFileSync(
        join(tempDir, "messages", "en.json"),
        JSON.stringify({ numeric: { "123key": "value", "456test": "value" } }),
      );
      writeFileSync(
        join(tempDir, "intl-typegen.config.yaml"),
        ["input: ./messages", "output: ./output", "overwrite: true"].join("\n"),
      );

      execSync(`node ${cliPath} generate`, { cwd: tempDir });

      const actual = readFileSync(join(tempDir, "output", "use-numeric-translation.ts"), "utf-8");
      const expected = [
        "export type NumericDictionary = {",
        "\t123key: string;",
        "\t456test: string;",
        "}",
        "",
        "export function useNumericTranslation() { /* TODO */ }",
        "",
      ].join("\n");
      expect(actual).toEqual(expected);
    });
  });

  describe("error cases", () => {
    test("should throw UsageError when variableNameConvention is missing {name} placeholder", () => {
      mkdirSync(join(tempDir, "messages"));
      writeFileSync(
        join(tempDir, "messages", "en.json"),
        JSON.stringify({ test: { key: "value" } }),
      );
      writeFileSync(
        join(tempDir, "intl-typegen.config.yaml"),
        [
          "input: ./messages",
          "output: ./output",
          "overwrite: false",
          "availableLocale:",
          "  variableNameConvention: schema",
        ].join("\n"),
      );

      expect(() => {
        execSync(`node ${cliPath} generate`, { cwd: tempDir, encoding: "utf-8", stdio: "pipe" });
      }).toThrow('variableNameConvention: "schema"');
    });
  });
});
