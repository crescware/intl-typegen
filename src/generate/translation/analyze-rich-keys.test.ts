import { describe, expect, test } from "vitest";

import {
  analyzeRichKeys,
  analyzeRichKeysAcrossLocales,
  type AnalyzeRichKeysResult,
} from "./analyze-rich-keys";

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

describe("analyzeRichKeysAcrossLocales()", () => {
  test("unions a tag present in only one locale for a shared key", () => {
    const en = { greeting: "Hello world" };
    const ja = { greeting: "こんにちは<b>世界</b>" };
    const merged = { greeting: "Hello world" };

    const actual = analyzeRichKeysAcrossLocales(merged, [en, ja]);
    expect(actual.richKeys).toEqual({ greeting: ["b"] });
  });

  test("merges distinct tags reported by different locales", () => {
    const en = { msg: "Read the <terms>Terms</terms>" };
    const ja = { msg: "<privacy>プライバシー</privacy>に同意する" };
    const merged = { msg: "Read the <terms>Terms</terms>" };

    const actual = analyzeRichKeysAcrossLocales(merged, [en, ja]);
    // Order follows the merged structure first, then newly seen tags by locale.
    expect(actual.richKeys).toEqual({ msg: ["terms", "privacy"] });
  });

  test("unions tags across three locales with differing tag counts (nested)", () => {
    // en=1 tag, fr=2 tags, ja=3 tags — all different counts. The result must be
    // the union (here the largest set), not whichever locale was inspected first.
    const en = { terms: "<bold>a</bold>" };
    const fr = { terms: "<bold>a</bold><italic>b</italic>" };
    const ja = { terms: "<bold>a</bold><italic>b</italic><underline>c</underline>" };

    const actual = analyzeRichKeysAcrossLocales({ terms: "<bold>a</bold>" }, [en, fr, ja]);
    expect(actual.richKeys).toEqual({ terms: ["bold", "italic", "underline"] });
  });

  test("unions disjoint tags across three locales (result exceeds any single locale)", () => {
    // Each locale carries different tags (counts 1, 3, 2). No single locale holds
    // them all, so the union must be strictly larger than the largest locale.
    const en = { terms: "<a>x</a>" };
    const fr = { terms: "<e>v</e><f>u</f>" };
    const ja = { terms: "<b>y</b><c>z</c><d>w</d>" };

    const actual = analyzeRichKeysAcrossLocales({ terms: "<a>x</a>" }, [en, fr, ja]);
    expect(Object.keys(actual.richKeys)).toEqual(["terms"]);
    const tags = [...(actual.richKeys["terms"] ?? [])].sort();
    expect(tags).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  test("deduplicates a tag shared by multiple locales", () => {
    const en = { msg: "<b>Hi</b>" };
    const ja = { msg: "<b>やあ</b>" };

    const actual = analyzeRichKeysAcrossLocales({ msg: "<b>Hi</b>" }, [en, ja]);
    expect(actual.richKeys).toEqual({ msg: ["b"] });
  });

  test("keeps plain keys empty when no locale has tags", () => {
    const en = { greeting: "Hello", farewell: "Bye" };
    const ja = { greeting: "やあ", farewell: "またね" };

    const actual = analyzeRichKeysAcrossLocales({ greeting: "Hello", farewell: "Bye" }, [en, ja]);
    expect(actual.richKeys).toEqual({ greeting: [], farewell: [] });
  });

  test("does not produce rich tags for keys absent from the merged structure", () => {
    // `onlyJa` is not part of the merged dictionary, so its tag must be dropped
    // to avoid a rich() signature referencing a non-existent key.
    const en = { greeting: "Hello" };
    const ja = { greeting: "やあ", onlyJa: "<b>x</b>" };

    const actual = analyzeRichKeysAcrossLocales({ greeting: "Hello" }, [en, ja]);
    expect(actual.richKeys).toEqual({ greeting: [] });
  });

  test("keeps another locale's tags when the first locale's value fails ICU parsing", () => {
    // The merged value is taken from the first-sorted locale, which is malformed
    // ICU here. The key must stay rich-eligible so ja's <b> tag is not dropped.
    const en = { msg: "Unbalanced {count brace" };
    const ja = { msg: "<b>太字</b>" };

    const actual = analyzeRichKeysAcrossLocales({ msg: "Unbalanced {count brace" }, [en, ja]);
    expect(actual.richKeys).toEqual({ msg: ["b"] });
    expect(actual.warnings).toHaveLength(1);
    expect(actual.warnings[0]).toContain("could not be parsed as ICU message");
  });

  test("deduplicates warnings reported by multiple locales", () => {
    const en = { msg: "Line<br/>break" };
    const ja = { msg: "行<br/>区切り" };

    const actual = analyzeRichKeysAcrossLocales({ msg: "Line<br/>break" }, [en, ja]);
    expect(actual.warnings).toEqual([
      'Key "msg" contains self-closing tag(s) <br/> which are not supported for rich text.',
    ]);
  });

  test("takes ignoredProperties from the merged structure", () => {
    const en = { label: "hello", count: 42 };
    const ja = { label: "やあ", count: 7 };

    const actual = analyzeRichKeysAcrossLocales({ label: "hello", count: 42 }, [en, ja]);
    expect(actual.ignoredProperties).toEqual([
      { key: "count", reason: "Number values are not valid translation messages" },
    ]);
  });

  test("falls back to the merged object when no variants are given", () => {
    const merged = { msg: "<b>Hi</b>" };

    const actual = analyzeRichKeysAcrossLocales(merged, []);
    expect(actual.richKeys).toEqual({ msg: ["b"] });
  });
});
