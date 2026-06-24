import { describe, expect, test } from "vitest";

import { collectKeyLines } from "./collect-key-lines";

describe("collectKeyLines()", () => {
  test("records the 1-based line of every nested object key", () => {
    const content = [
      "{",
      '  "Common": {',
      '    "ok": "OK",',
      '    "cancel": "Cancel"',
      "  },",
      '  "Footer": {',
      '    "copyright": "(c) 2026"',
      "  }",
      "}",
    ].join("\n");

    const lines = collectKeyLines(content);

    expect(lines.get("Common")).toBe(2);
    expect(lines.get("Common.ok")).toBe(3);
    expect(lines.get("Common.cancel")).toBe(4);
    expect(lines.get("Footer")).toBe(6);
    expect(lines.get("Footer.copyright")).toBe(7);
  });

  test("records deeply nested keys with dotted paths", () => {
    const content = ['{ "a": { "b": { "c": "value" } } }'].join("\n");

    const lines = collectKeyLines(content);

    expect([...lines.keys()].sort()).toEqual(["a", "a.b", "a.b.c"]);
  });

  test("does not descend into array values", () => {
    const content = '{ "list": [1, 2, 3], "leaf": "x" }';

    const lines = collectKeyLines(content);

    expect([...lines.keys()].sort()).toEqual(["leaf", "list"]);
  });

  test("resolves duplicate keys last-wins to match JSON.parse", () => {
    const content = [
      "{",
      '  "Common": { "ok": "a" },',
      '  "Common": { "cancel": "b" }',
      "}",
    ].join("\n");

    const lines = collectKeyLines(content);

    // JSON.parse keeps only the last "Common" block, so "Common.ok" is gone and
    // the namespace line points at the surviving (second) occurrence.
    expect([...lines.keys()].sort()).toEqual(["Common", "Common.cancel"]);
    expect(lines.get("Common")).toBe(3);
    expect(lines.get("Common.cancel")).toBe(3);
    expect(lines.has("Common.ok")).toBe(false);
  });

  test("returns an empty map for unparseable content", () => {
    expect(collectKeyLines("{ not json").size).toBe(0);
  });
});
