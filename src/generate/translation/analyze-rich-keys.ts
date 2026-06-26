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

/**
 * Analyze rich keys using every locale, not just one. A given key may carry rich
 * tags in some locales but appear as plain text in others (e.g. only `ja-JP`
 * wraps a phrase in `<b>`). The rich() signature must cover the union of tags
 * across all locales, otherwise the chunk renderers required by some
 * translations would be missing from the generated type.
 *
 * The dictionary structure comes from `mergedObj`; only its string-valued keys
 * can receive rich signatures. Tags seen in a locale for a key absent from the
 * merged structure are dropped, so `rich()` never references a non-existent key.
 * `ignoredProperties` is taken from the merged structure (deterministic and free
 * of cross-locale duplicates); warnings are unioned across locales and
 * deduplicated.
 */
export function analyzeRichKeysAcrossLocales(
  mergedObj: Record<string, JsonValue>,
  localeVariants: readonly Record<string, JsonValue>[],
): AnalyzeRichKeysResult<string> {
  const base = analyzeRichKeys(mergedObj);

  // Seed a tag set for every dictionary key, i.e. every string-valued key in the
  // merged structure (the same criterion filterValidValues uses to build the
  // dictionary body). Non-string keys stay out, since they live in
  // ignoredProperties and never receive a rich() signature.
  //
  // Keying off the value type rather than base.richKeys is deliberate: a key
  // whose merged (first-locale) value fails ICU parsing is omitted from
  // base.richKeys, yet it still appears in the dictionary. Such a key must stay
  // rich-eligible so that tags contributed by other locales are not dropped.
  const tagsByKey = new Map<string, string[]>();
  for (const [key, value] of Object.entries(mergedObj)) {
    if (typeof value !== "string") {
      continue;
    }
    tagsByKey.set(key, [...(base.richKeys[key] ?? [])]);
  }

  const warnings: string[] = [...base.warnings];

  for (const variant of localeVariants) {
    const analyzed = analyzeRichKeys(variant);

    for (const [key, tags] of Object.entries(analyzed.richKeys)) {
      const merged = tagsByKey.get(key);
      if (merged === undefined) {
        continue;
      }
      for (const tag of tags) {
        if (!merged.includes(tag)) {
          merged.push(tag);
        }
      }
    }

    for (const warning of analyzed.warnings) {
      if (!warnings.includes(warning)) {
        warnings.push(warning);
      }
    }
  }

  const richKeys: Record<string, readonly string[]> = {};
  for (const [key, tags] of tagsByKey) {
    richKeys[key] = tags;
  }

  return {
    richKeys,
    warnings,
    ignoredProperties: base.ignoredProperties,
  };
}
