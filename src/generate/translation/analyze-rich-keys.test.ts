import { describe, expect, test } from "vitest";

import { analyzeRichKeys, type AnalyzeRichKeysResult } from "./analyze-rich-keys";

describe("analyzeRichKeys()", () => {
  test("returns empty result for plain text values", () => {
    const expected = {
      richKeys: { greeting: [] },
      warnings: [],
      ignoredProperties: [],
    } as const satisfies AnalyzeRichKeysResult<string>;

    const actual = analyzeRichKeys({ greeting: "Hello world" });
    expect(actual).toEqual(expected);
  });

  test("extracts rich keys with tags", () => {
    const expected = {
      richKeys: { message: ["bold"] },
      warnings: [],
      ignoredProperties: [],
    } as const satisfies AnalyzeRichKeysResult<string>;

    const actual = analyzeRichKeys({ message: "Hello <bold>world</bold>" });
    expect(actual).toEqual(expected);
  });

  test("extracts multiple tags from single key", () => {
    const expected = {
      richKeys: { terms: ["link", "privacy"] },
      warnings: [],
      ignoredProperties: [],
    } as const satisfies AnalyzeRichKeysResult<string>;

    const actual = analyzeRichKeys({
      terms: "Agree to <link>Terms</link> and <privacy>Privacy</privacy>",
    });
    expect(actual).toEqual(expected);
  });

  test("extracts rich keys from multiple keys", () => {
    const expected = {
      richKeys: { first: ["a"], second: ["b"] },
      warnings: [],
      ignoredProperties: [],
    } as const satisfies AnalyzeRichKeysResult<string>;

    const actual = analyzeRichKeys({ first: "<a>link</a>", second: "<b>bold</b>" });
    expect(actual).toEqual(expected);
  });

  test("handles mixed rich and plain text keys", () => {
    const expected = {
      richKeys: { first: ["a"], second: [] },
      warnings: [],
      ignoredProperties: [],
    } as const satisfies AnalyzeRichKeysResult<string>;

    const actual = analyzeRichKeys({ first: "<a>link</a>", second: "second" });
    expect(actual).toEqual(expected);
  });

  describe("warnings", () => {
    test("warns on malformed ICU syntax", () => {
      const expected = {
        richKeys: {},
        warnings: [
          'Key "broken" could not be parsed as ICU message: MISSING_OTHER_CLAUSE. Skipping rich text extraction.',
        ],
        ignoredProperties: [],
      } as const satisfies AnalyzeRichKeysResult<string>;

      const actual = analyzeRichKeys({ broken: "{count, plural, one {item}" });
      expect(actual).toEqual(expected);
    });

    test("warns on self-closing tags", () => {
      const expected = {
        richKeys: { message: [] },
        warnings: [
          'Key "message" contains self-closing tag(s) <br/> which are not supported for rich text.',
        ],
        ignoredProperties: [],
      } as const satisfies AnalyzeRichKeysResult<string>;

      const actual = analyzeRichKeys({ message: "Line one<br/>Line two" });
      expect(actual).toEqual(expected);
    });

    test("warns on multiple self-closing tags", () => {
      const expected = {
        richKeys: { message: [] },
        warnings: [
          'Key "message" contains self-closing tag(s) <x/>, <y/> which are not supported for rich text.',
        ],
        ignoredProperties: [],
      } as const satisfies AnalyzeRichKeysResult<string>;

      const actual = analyzeRichKeys({ message: "a<x/>b<y/>c" });
      expect(actual).toEqual(expected);
    });
  });

  describe("ignored properties", () => {
    test("ignores nested object", () => {
      const expected = {
        richKeys: {},
        warnings: [],
        ignoredProperties: [{ key: "section", reason: "Nested objects are not supported" }],
      } as const satisfies AnalyzeRichKeysResult<string>;

      const actual = analyzeRichKeys({ section: { nested: "text" } });
      expect(actual).toEqual(expected);
    });

    test("ignores number values", () => {
      const expected = {
        richKeys: {},
        warnings: [],
        ignoredProperties: [
          { key: "count", reason: "Number values are not valid translation messages" },
        ],
      } as const satisfies AnalyzeRichKeysResult<string>;

      const actual = analyzeRichKeys({ count: 42 });
      expect(actual).toEqual(expected);
    });

    test("ignores boolean values", () => {
      const expected = {
        richKeys: {},
        warnings: [],
        ignoredProperties: [
          { key: "enabled", reason: "Boolean values are not valid translation messages" },
        ],
      } as const satisfies AnalyzeRichKeysResult<string>;

      const actual = analyzeRichKeys({ enabled: true });
      expect(actual).toEqual(expected);
    });

    test("ignores null values", () => {
      const expected = {
        richKeys: {},
        warnings: [],
        ignoredProperties: [
          { key: "empty", reason: "Null values are not valid translation messages" },
        ],
      } as const satisfies AnalyzeRichKeysResult<string>;

      const actual = analyzeRichKeys({ empty: null });
      expect(actual).toEqual(expected);
    });

    test("ignores array values", () => {
      const expected = {
        richKeys: {},
        warnings: [],
        ignoredProperties: [{ key: "items", reason: "Array values are not supported" }],
      } as const satisfies AnalyzeRichKeysResult<string>;

      const actual = analyzeRichKeys({ items: ["one", "two"] });
      expect(actual).toEqual(expected);
    });
  });
});
