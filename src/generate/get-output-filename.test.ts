import { describe, expect, test } from "vitest";

import { getOutputFilename } from "./get-output-filename";

describe("getOutputFilename()", () => {
  test("converts camelCase to kebab-case", () => {
    expect(getOutputFilename("fooBar")).toBe("use-foo-bar-translations.ts");
  });

  test("converts PascalCase to kebab-case", () => {
    expect(getOutputFilename("FooBar")).toBe("use-foo-bar-translations.ts");
  });

  test("keeps already kebab-case as is", () => {
    expect(getOutputFilename("foo-bar")).toBe("use-foo-bar-translations.ts");
  });

  test("converts snake_case to kebab-case", () => {
    expect(getOutputFilename("foo_bar")).toBe("use-foo-bar-translations.ts");
  });

  test("handles single word", () => {
    expect(getOutputFilename("foo")).toBe("use-foo-translations.ts");
  });
});
