import { describe, expect, it } from "vitest";

import { generateTypescriptLocaleFile } from "./generate-typescript-locale-file";

describe("generateTypescriptLocaleFile()", () => {
  it("generates with default convention", () => {
    const result = generateTypescriptLocaleFile(["en-US", "ja-JP"], "availableLocale", "{name}");

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

  it("generates with Schema suffix convention", () => {
    const result = generateTypescriptLocaleFile(
      ["en-US", "ja-JP"],
      "availableLocale",
      "{name}Schema",
    );

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

  it("generates with schemaOf prefix convention", () => {
    const result = generateTypescriptLocaleFile(
      ["en-US", "ja-JP"],
      "availableLocale",
      "schemaOf{name}",
    );

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
