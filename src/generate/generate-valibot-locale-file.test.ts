import { describe, expect, it } from "vitest";

import { generateValibotLocaleFile } from "./generate-valibot-locale-file";

describe("generateValibotLocaleFile()", () => {
  it("generates valibot locale file", () => {
    const result = generateValibotLocaleFile(["en-US", "ja-JP"], "availableLocale", "{name}Schema");

    expect(result).toBe(
      [
        'import { type InferOutput, literal, picklist } from "valibot";',
        "",
        'export const enUSSchema = literal("en-US");',
        'export const jaJPSchema = literal("ja-JP");',
        "",
        "export const availableLocaleSchema = picklist([enUSSchema.literal, jaJPSchema.literal]);",
        "",
        "export type AvailableLocale = InferOutput<typeof availableLocaleSchema>;",
        "",
      ].join("\n"),
    );
  });
});
