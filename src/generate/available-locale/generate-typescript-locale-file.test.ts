import { describe, expect, test } from "vitest";

import { generateTypescriptLocaleFile } from "./generate-typescript-locale-file";

describe("generateTypescriptLocaleFile()", () => {
  test("generates with default convention", () => {
    const result = generateTypescriptLocaleFile(["en-US", "ja-JP"], {
      name: "availableLocale",
      variableNameConvention: "{name}",
    });

    expect(result).toBe(
      [
        'export const enUS = "en-US" as const;',
        'export const jaJP = "ja-JP" as const;',
        "",
        "export const availableLocale = [enUS, jaJP] as const;",
        "",
        "export type AvailableLocale = (typeof availableLocale)[number];",
        "",
      ].join("\n"),
    );
  });

  test("generates with Schema suffix convention", () => {
    const result = generateTypescriptLocaleFile(["en-US", "ja-JP"], {
      name: "availableLocale",
      variableNameConvention: "{name}Schema",
    });

    expect(result).toBe(
      [
        'export const enUSSchema = "en-US" as const;',
        'export const jaJPSchema = "ja-JP" as const;',
        "",
        "export const availableLocaleSchema = [enUSSchema, jaJPSchema] as const;",
        "",
        "export type AvailableLocale = (typeof availableLocaleSchema)[number];",
        "",
      ].join("\n"),
    );
  });

  test("generates with schemaOf prefix convention", () => {
    const result = generateTypescriptLocaleFile(["en-US", "ja-JP"], {
      name: "availableLocale",
      variableNameConvention: "schemaOf{name}",
    });

    expect(result).toBe(
      [
        'export const schemaOfEnUS = "en-US" as const;',
        'export const schemaOfJaJP = "ja-JP" as const;',
        "",
        "export const schemaOfAvailableLocale = [schemaOfEnUS, schemaOfJaJP] as const;",
        "",
        "export type AvailableLocale = (typeof schemaOfAvailableLocale)[number];",
        "",
      ].join("\n"),
    );
  });
});
