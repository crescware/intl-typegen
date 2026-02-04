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
        'import { useTranslations } from "next-intl";',
        'import type { DeepReadonly } from "ts-essentials";',
        "",
        "type AaaDictionary = DeepReadonly<{",
        "\ta1: string;",
        "\ta2: string;",
        "}>;",
        "",
        "type AaaTranslations = {",
        "\t(key: keyof AaaDictionary): string;",
        "};",
        "",
        "export function useAaaTranslations(): AaaTranslations {",
        '\treturn useTranslations("aaa");',
        "}",
        "",
        "use-foo-bar-translation.ts",
        "---",
        'import { useTranslations } from "next-intl";',
        'import type { DeepReadonly } from "ts-essentials";',
        "",
        "type FooBarDictionary = DeepReadonly<{",
        "\tfoo: string;",
        "}>;",
        "",
        "type FooBarTranslations = {",
        "\t(key: keyof FooBarDictionary): string;",
        "};",
        "",
        "export function useFooBarTranslations(): FooBarTranslations {",
        '\treturn useTranslations("fooBar");',
        "}",
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
        'import { useTranslations } from "next-intl";',
        'import type { DeepReadonly } from "ts-essentials";',
        "",
        "type ReservedDictionary = DeepReadonly<{",
        "\tclass: string;",
        "\tfunction: string;",
        "\tif: string;",
        "}>;",
        "",
        "type ReservedTranslations = {",
        "\t(key: keyof ReservedDictionary): string;",
        "};",
        "",
        "export function useReservedTranslations(): ReservedTranslations {",
        '\treturn useTranslations("reserved");',
        "}",
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
        'import { useTranslations } from "next-intl";',
        'import type { DeepReadonly } from "ts-essentials";',
        "",
        "type KebabDictionary = DeepReadonly<{",
        `\t"foo-bar": string;`,
        `\t"hello-world": string;`,
        "}>;",
        "",
        "type KebabTranslations = {",
        "\t(key: keyof KebabDictionary): string;",
        "};",
        "",
        "export function useKebabTranslations(): KebabTranslations {",
        '\treturn useTranslations("kebab");',
        "}",
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
        'import { useTranslations } from "next-intl";',
        'import type { DeepReadonly } from "ts-essentials";',
        "",
        "type NumericDictionary = DeepReadonly<{",
        `\t"123key": string;`,
        `\t"456test": string;`,
        "}>;",
        "",
        "type NumericTranslations = {",
        "\t(key: keyof NumericDictionary): string;",
        "};",
        "",
        "export function useNumericTranslations(): NumericTranslations {",
        '\treturn useTranslations("numeric");',
        "}",
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

    test("should throw UsageError when input directory not found", () => {
      writeFileSync(
        join(tempDir, "intl-typegen.config.yaml"),
        ["input: ./nonexistent", "output: ./output", "overwrite: false"].join("\n"),
      );

      expect(() => {
        execSync(`node ${cliPath} generate`, { cwd: tempDir, encoding: "utf-8", stdio: "pipe" });
      }).toThrow("Input directory not found");
    });

    test("should throw UsageError when input directory contains no JSON files", () => {
      mkdirSync(join(tempDir, "messages"));
      writeFileSync(
        join(tempDir, "intl-typegen.config.yaml"),
        ["input: ./messages", "output: ./output", "overwrite: false"].join("\n"),
      );

      expect(() => {
        execSync(`node ${cliPath} generate`, { cwd: tempDir, encoding: "utf-8", stdio: "pipe" });
      }).toThrow("contains no JSON files");
    });

    test("should throw UsageError when config file not found", () => {
      expect(() => {
        execSync(`node ${cliPath} generate`, { cwd: tempDir, encoding: "utf-8", stdio: "pipe" });
      }).toThrow("Config file not found");
    });

    test("should throw UsageError when input file contains invalid JSON", () => {
      mkdirSync(join(tempDir, "messages"));
      writeFileSync(join(tempDir, "messages", "en.json"), "{ invalid json }");
      writeFileSync(
        join(tempDir, "intl-typegen.config.yaml"),
        ["input: ./messages", "output: ./output", "overwrite: false"].join("\n"),
      );

      expect(() => {
        execSync(`node ${cliPath} generate`, { cwd: tempDir, encoding: "utf-8", stdio: "pipe" });
      }).toThrow("Invalid JSON");
    });

    test("should throw UsageError when config file contains invalid YAML", () => {
      writeFileSync(join(tempDir, "intl-typegen.config.yaml"), "invalid: yaml: syntax:");

      expect(() => {
        execSync(`node ${cliPath} generate`, { cwd: tempDir, encoding: "utf-8", stdio: "pipe" });
      }).toThrow("Invalid YAML");
    });

    test("should throw UsageError when config is missing required fields", () => {
      writeFileSync(join(tempDir, "intl-typegen.config.yaml"), "input: ./messages");

      expect(() => {
        execSync(`node ${cliPath} generate`, { cwd: tempDir, encoding: "utf-8", stdio: "pipe" });
      }).toThrow("Invalid config");
    });

    test("should throw UsageError when top-level value is not an object", () => {
      mkdirSync(join(tempDir, "messages"));
      writeFileSync(join(tempDir, "messages", "en.json"), JSON.stringify({ test: "string value" }));
      writeFileSync(
        join(tempDir, "intl-typegen.config.yaml"),
        ["input: ./messages", "output: ./output", "overwrite: false"].join("\n"),
      );

      expect(() => {
        execSync(`node ${cliPath} generate`, { cwd: tempDir, encoding: "utf-8", stdio: "pipe" });
      }).toThrow("Expected Object");
    });

    test("should throw UsageError when duplicate top-level keys exist across files", () => {
      mkdirSync(join(tempDir, "messages"));
      writeFileSync(
        join(tempDir, "messages", "en.json"),
        JSON.stringify({ common: { key: "en" } }),
      );
      writeFileSync(
        join(tempDir, "messages", "ja.json"),
        JSON.stringify({ common: { key: "ja" } }),
      );
      writeFileSync(
        join(tempDir, "intl-typegen.config.yaml"),
        ["input: ./messages", "output: ./output", "overwrite: false"].join("\n"),
      );

      expect(() => {
        execSync(`node ${cliPath} generate`, { cwd: tempDir, encoding: "utf-8", stdio: "pipe" });
      }).toThrow("Duplicate top-level key");
    });
  });
});
