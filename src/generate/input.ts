import { type InferOutput, record, string } from "valibot";

import { jsonValueSchema } from "./json-value";

export const inputSchema = record(string(), record(string(), jsonValueSchema));

export type Input = InferOutput<typeof inputSchema>;
