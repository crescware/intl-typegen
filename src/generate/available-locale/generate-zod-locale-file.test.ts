import { describe, expect, test } from "vitest";

import { generateZodLocaleFile } from "./generate-zod-locale-file";

describe("generateZodLocaleFile()", () => {
  test("generates zod locale file", () => {
    const result = generateZodLocaleFile(["en-US", "ja-JP"], {
      name: "availableLocale",
      variableNameConvention: "{name}Schema",
    });

    expect(result).toBe(
      [
        'import { z } from "zod";',
        "",
        'export const enUSSchema = z.literal("en-US");',
        'export const jaJPSchema = z.literal("ja-JP");',
        "",
        "export const availableLocaleSchema = z.union([enUSSchema, jaJPSchema]);",
        "",
        "export type AvailableLocale = z.infer<typeof availableLocaleSchema>;",
        "",
      ].join("\n"),
    );
  });
});
