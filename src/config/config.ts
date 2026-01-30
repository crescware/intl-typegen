import { boolean, type InferOutput, object, optional, picklist, string } from "valibot";

export const availableLocaleConfigSchema = object({
  declaration: optional(picklist(["typescript", "valibot", "zod"]), "typescript"),
  name: optional(string(), "availableLocale"),
  variableNameConvention: optional(string(), "{name}"),
});

export const configSchema = object({
  input: string(),
  output: string(),
  overwrite: boolean(),
  availableLocale: optional(availableLocaleConfigSchema, {}),
});

export type AvailableLocaleConfig = InferOutput<typeof availableLocaleConfigSchema>;
export type Config = InferOutput<typeof configSchema>;
