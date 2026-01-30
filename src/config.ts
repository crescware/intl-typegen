import { boolean, type InferOutput, object, string } from "valibot";

export const configSchema = object({
  input: string(),
  output: string(),
  overwrite: boolean(),
});

export type Config = InferOutput<typeof configSchema>;
