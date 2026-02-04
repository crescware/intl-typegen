import { describe, expect, test } from "vitest";

import { extractRichTags } from "./extract-rich-tags";
import { IcuParseError } from "./icu-parse-error";

describe("extractRichTags()", () => {
  test("returns empty arrays for plain text", () => {
    const expected = { tags: [], selfClosingTags: [] } as const satisfies ReturnType<
      typeof extractRichTags
    >;

    const actual = extractRichTags("Hello world");
    expect(actual).toEqual(expected);
  });

  test("extracts single tag", () => {
    const expected = { tags: ["link"], selfClosingTags: [] } as const satisfies ReturnType<
      typeof extractRichTags
    >;

    const actual = extractRichTags("Click <link>here</link>");
    expect(actual).toEqual(expected);
  });

  test("extracts multiple tags", () => {
    const expected = {
      tags: ["terms", "privacy"],
      selfClosingTags: [],
    } as const satisfies ReturnType<typeof extractRichTags>;

    const actual = extractRichTags(
      "I agree to the <terms>Terms</terms> and <privacy>Privacy</privacy>",
    );
    expect(actual).toEqual(expected);
  });

  test("extracts nested tags", () => {
    const expected = {
      tags: ["outer", "inner"],
      selfClosingTags: [],
    } as const satisfies ReturnType<typeof extractRichTags>;

    const actual = extractRichTags("<outer>Hello <inner>world</inner></outer>");
    expect(actual).toEqual(expected);
  });

  test("extracts self-closing tag", () => {
    const expected = { tags: [], selfClosingTags: ["br"] } as const satisfies ReturnType<
      typeof extractRichTags
    >;

    const actual = extractRichTags("Line one<br/>Line two");
    expect(actual).toEqual(expected);
  });

  test("extracts tags inside plural", () => {
    const expected = { tags: ["strong"], selfClosingTags: [] } as const satisfies ReturnType<
      typeof extractRichTags
    >;

    const actual = extractRichTags(
      "{count, plural, one {<strong>#</strong> item} other {<strong>#</strong> items}}",
    );
    expect(actual).toEqual(expected);
  });

  test("extracts tags inside select", () => {
    const expected = { tags: ["bold"], selfClosingTags: [] } as const satisfies ReturnType<
      typeof extractRichTags
    >;

    const actual = extractRichTags(
      "{gender, select, male {<bold>He</bold>} female {<bold>She</bold>} other {<bold>They</bold>}}",
    );
    expect(actual).toEqual(expected);
  });

  test("deduplicates repeated tags", () => {
    const expected = { tags: ["b"], selfClosingTags: [] } as const satisfies ReturnType<
      typeof extractRichTags
    >;

    const actual = extractRichTags("<b>one</b> and <b>two</b>");
    expect(actual).toEqual(expected);
  });

  describe("error cases", () => {
    test("throws IcuParseError on malformed ICU syntax", () => {
      expect(() => extractRichTags("{count, plural, one {item}")).toThrow(IcuParseError);
    });

    test("throws IcuParseError on invalid XML nesting", () => {
      expect(() => extractRichTags("<a><b></a></b>")).toThrow(IcuParseError);
    });

    test("throws IcuParseError on unclosed tag", () => {
      expect(() => extractRichTags("<bold>hello")).toThrow(IcuParseError);
    });

    test("throws IcuParseError on closing tag without opening tag", () => {
      expect(() => extractRichTags("hello</bold>")).toThrow(IcuParseError);
    });
  });
});
