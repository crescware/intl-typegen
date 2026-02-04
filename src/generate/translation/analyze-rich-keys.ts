import type { JsonValue } from "./json-value";

import { PreconditionError } from "../../errors/precondition-error";
import { extractRichTags, type ExtractRichTagsResult } from "./extract-rich-tags";
import { IcuParseError } from "./icu-parse-error";

export type RichKeys<T extends string> = Readonly<Record<T, readonly string[]>>;

export type IgnoredProperty = Readonly<{
  key: string;
  reason: string;
}>;

export type AnalyzeRichKeysResult<T extends string> = Readonly<{
  richKeys: RichKeys<T>;
  warnings: readonly string[];
  ignoredProperties: readonly IgnoredProperty[];
}>;

type TemporaryAnalyzedRichKeys = AnalyzeRichKeysResult<string>;

function mergeResults(
  a: TemporaryAnalyzedRichKeys,
  b: TemporaryAnalyzedRichKeys,
): TemporaryAnalyzedRichKeys {
  return {
    richKeys: { ...a.richKeys, ...b.richKeys },
    warnings: [...a.warnings, ...b.warnings],
    ignoredProperties: [...a.ignoredProperties, ...b.ignoredProperties],
  };
}

function addIgnoredProperty(
  acc: TemporaryAnalyzedRichKeys,
  property: IgnoredProperty,
): TemporaryAnalyzedRichKeys {
  return {
    ...acc,
    ignoredProperties: [...acc.ignoredProperties, property],
  };
}

function isIgnoredValue(value: JsonValue): value is JsonValue[] | number | boolean | null {
  return (
    Array.isArray(value) ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  );
}

function analyzeStringValue(value: string, key: string): TemporaryAnalyzedRichKeys {
  let result: ExtractRichTagsResult;
  try {
    result = extractRichTags(value);
  } catch (e) {
    if (e instanceof IcuParseError) {
      return {
        richKeys: {},
        warnings: [
          `Key "${key}" could not be parsed as ICU message: ${e.message}. Skipping rich text extraction.`,
        ],
        ignoredProperties: [],
      };
    }
    throw e;
  }

  const warnings = (
    result.selfClosingTags.length > 0
      ? [
          `Key "${key}" contains self-closing tag(s) <${result.selfClosingTags.join("/>, <")}/> which are not supported for rich text.`,
        ]
      : []
  ) satisfies readonly string[];

  return {
    richKeys: { [key]: result.tags },
    warnings,
    ignoredProperties: [],
  };
}

export function analyzeRichKeys<T extends string>(
  obj: Record<T, JsonValue>,
): AnalyzeRichKeysResult<T> {
  const keys = Object.keys(obj) as T[];

  const initial: TemporaryAnalyzedRichKeys = {
    richKeys: {},
    warnings: [],
    ignoredProperties: [],
  };

  const result = keys.reduce<TemporaryAnalyzedRichKeys>((acc, key) => {
    const value = obj[key];

    if (typeof value === "string") {
      return mergeResults(acc, analyzeStringValue(value, key));
    }

    if (isIgnoredValue(value)) {
      if (Array.isArray(value)) {
        return addIgnoredProperty(acc, {
          key,
          reason: "Array values are not supported",
        });
      }

      if (typeof value === "number") {
        return addIgnoredProperty(acc, {
          key,
          reason: "Number values are not valid translation messages",
        });
      }

      if (typeof value === "boolean") {
        return addIgnoredProperty(acc, {
          key,
          reason: "Boolean values are not valid translation messages",
        });
      }

      if (value === null) {
        return addIgnoredProperty(acc, {
          key,
          reason: "Null values are not valid translation messages",
        });
      }

      throw new PreconditionError(
        "Unreachable: isIgnoredValue returned true but value type is unknown",
      );
    }

    if (typeof value === "object" && value !== null) {
      return addIgnoredProperty(acc, {
        key,
        reason: "Nested objects are not supported",
      });
    }

    throw new PreconditionError("Unreachable: unknown JsonValue type");
  }, initial);

  return result as AnalyzeRichKeysResult<T>;
}
