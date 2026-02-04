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

/**
 * Represents any valid JSON value.
 *
 * Note: This schema accepts all JSON types for parsing flexibility, but only
 * `string` values are valid for translation messages at the top level.
 * Other types (number, boolean, null, array, nested object) will be reported
 * as ignored properties during the generation phase with explanatory reasons.
 */
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
