import { describe, expect, test } from "vitest";

import {
  findKeyDiscrepancies,
  formatKeyDiscrepancies,
  type LocaleFileKeys,
} from "./check-locale-key-consistency";

function localeFile(file: string, keyLines: Record<string, number>): LocaleFileKeys {
  return { file, keyLines: new Map(Object.entries(keyLines)) };
}

describe("findKeyDiscrepancies()", () => {
  test("returns nothing for a single file", () => {
    const result = findKeyDiscrepancies([localeFile("en.json", { "Common.ok": 1 })]);
    expect(result).toEqual([]);
  });

  test("returns nothing when every file has the same keys", () => {
    const result = findKeyDiscrepancies([
      localeFile("en.json", { Common: 1, "Common.ok": 2 }),
      localeFile("ja.json", { Common: 1, "Common.ok": 2 }),
    ]);
    expect(result).toEqual([]);
  });

  test("reports a leaf key missing in one locale, pointing at where it is defined", () => {
    const result = findKeyDiscrepancies([
      localeFile("en-US.json", { Common: 2, "Common.ok": 3, "Common.cancel": 4 }),
      localeFile("ja-JP.json", { Common: 2, "Common.ok": 3 }),
    ]);

    expect(result).toEqual([
      {
        file: "ja-JP.json",
        key: "Common.cancel",
        definedIn: [{ file: "en-US.json", line: 4 }],
      },
    ]);
  });

  test("reports an entirely missing namespace as a single boundary key, not its descendants", () => {
    const result = findKeyDiscrepancies([
      localeFile("en-US.json", { Common: 2, "Common.ok": 3 }),
      localeFile("ja-JP.json", {
        Common: 2,
        "Common.ok": 3,
        Footer: 6,
        "Footer.copyright": 7,
        "Footer.links": 8,
      }),
    ]);

    expect(result).toEqual([
      {
        file: "en-US.json",
        key: "Footer",
        definedIn: [{ file: "ja-JP.json", line: 6 }],
      },
    ]);
  });

  test("reports a flat dotted key whose implied parent exists in no file", () => {
    const result = findKeyDiscrepancies([
      localeFile("en.json", { Common: 1, "Common.ok": 1, "Common.profile.name": 1 }),
      localeFile("ja.json", { Common: 1, "Common.ok": 1 }),
    ]);

    // "Common.profile" is a phantom path (no file defines it), so the genuine
    // mismatch on the flat "profile.name" key must not be suppressed.
    expect(result).toEqual([
      {
        file: "ja.json",
        key: "Common.profile.name",
        definedIn: [{ file: "en.json", line: 1 }],
      },
    ]);
  });

  test("reports both directions of a mismatch", () => {
    const result = findKeyDiscrepancies([
      localeFile("en-US.json", { Common: 1, "Common.onlyEn": 2 }),
      localeFile("ja-JP.json", { Common: 1, "Common.onlyJa": 3 }),
    ]);

    expect(result).toEqual([
      {
        file: "en-US.json",
        key: "Common.onlyJa",
        definedIn: [{ file: "ja-JP.json", line: 3 }],
      },
      {
        file: "ja-JP.json",
        key: "Common.onlyEn",
        definedIn: [{ file: "en-US.json", line: 2 }],
      },
    ]);
  });

  test("lists every locale that defines a key missing from a third", () => {
    const result = findKeyDiscrepancies([
      localeFile("a.json", { Common: 1, "Common.x": 2 }),
      localeFile("b.json", { Common: 1, "Common.x": 5 }),
      localeFile("c.json", { Common: 1 }),
    ]);

    expect(result).toEqual([
      {
        file: "c.json",
        key: "Common.x",
        definedIn: [
          { file: "a.json", line: 2 },
          { file: "b.json", line: 5 },
        ],
      },
    ]);
  });
});

describe("formatKeyDiscrepancies()", () => {
  test("renders a header and one line per discrepancy", () => {
    const block = formatKeyDiscrepancies("./messages", 2, [
      {
        file: "ja-JP.json",
        key: "Common.cancel",
        definedIn: [{ file: "en-US.json", line: 4 }],
      },
    ]);

    expect(block).toBe(
      [
        "[intl-typegen] Translation key mismatch across 2 locale files in ./messages:",
        '  ja-JP.json: missing key "Common.cancel" (defined in en-US.json:4)',
      ].join("\n"),
    );
  });

  test("joins multiple definition sites with commas", () => {
    const block = formatKeyDiscrepancies("./messages", 3, [
      {
        file: "c.json",
        key: "Common.x",
        definedIn: [
          { file: "a.json", line: 2 },
          { file: "b.json", line: 5 },
        ],
      },
    ]);

    expect(block).toContain('  c.json: missing key "Common.x" (defined in a.json:2, b.json:5)');
  });
});
