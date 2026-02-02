import {
  array,
  boolean,
  type GenericSchema,
  lazy,
  null as null_,
  number,
  record,
  string,
  union,
} from "valibot";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: GenericSchema<JsonValue> = union([
  string(),
  number(),
  boolean(),
  null_(),
  array(lazy(() => jsonValueSchema)),
  record(
    string(),
    lazy(() => jsonValueSchema),
  ),
]);
