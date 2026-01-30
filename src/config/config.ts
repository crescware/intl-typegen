import { boolean, type InferOutput, literal, object, optional, picklist, string } from "valibot";

const typescriptSchema = literal("typescript");
const valibotSchema = literal("valibot");
const zodSchema = literal("zod");

const declarationSchema = picklist([
  typescriptSchema.literal,
  valibotSchema.literal,
  zodSchema.literal,
]);

export const availableLocaleConfigSchema = object({
  declaration: declarationSchema,
  name: string(),
  variableNameConvention: string(),
});

export type AvailableLocaleConfig = InferOutput<typeof availableLocaleConfigSchema>;

export const availableLocaleConfigDefaults: AvailableLocaleConfig = {
  declaration: typescriptSchema.literal,
  name: "availableLocale",
  variableNameConvention: "{name}",
};

const partialAvailableLocaleConfigSchema = object({
  declaration: optional(declarationSchema),
  name: optional(string()),
  variableNameConvention: optional(string()),
});

export const configSchema = object({
  input: string(),
  output: string(),
  overwrite: boolean(),
  availableLocale: optional(partialAvailableLocaleConfigSchema),
});

type PartialConfig = InferOutput<typeof configSchema>;

export type Config = Omit<PartialConfig, "availableLocale"> & {
  availableLocale: AvailableLocaleConfig;
};
