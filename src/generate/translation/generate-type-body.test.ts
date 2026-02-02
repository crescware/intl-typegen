import { describe, expect, test } from "vitest";

import { generateTypeBody } from "./generate-type-body";

describe("generateTypeBody()", () => {
  test("generates type body for flat object", () => {
    const result = generateTypeBody({ foo: "bar", count: 42 });
    expect(result).toBe("{\n\tfoo: string;\n\tcount: number;\n}");
  });

  test("generates type body for nested object", () => {
    const result = generateTypeBody({ outer: { inner: "value" } });
    expect(result).toBe("{\n\touter: {\n\t\tinner: string;\n\t};\n}");
  });

  test("quotes kebab-case keys", () => {
    const result = generateTypeBody({ "foo-bar": "value" });
    expect(result).toBe(`{\n\t"foo-bar": string;\n}`);
  });

  test("quotes keys starting with numbers", () => {
    const result = generateTypeBody({ "123key": "value" });
    expect(result).toBe(`{\n\t"123key": string;\n}`);
  });

  test("does not quote reserved words", () => {
    const result = generateTypeBody({ class: "value", function: "value" });
    expect(result).toBe("{\n\tclass: string;\n\tfunction: string;\n}");
  });

  test("escapes double quotes in keys", () => {
    const result = generateTypeBody({ 'key"with"quotes': "value" });
    expect(result).toBe(`{\n\t"key\\"with\\"quotes": string;\n}`);
  });

  test("escapes backslashes in keys", () => {
    const result = generateTypeBody({ "key\\with\\backslash": "value" });
    expect(result).toBe(`{\n\t"key\\\\with\\\\backslash": string;\n}`);
  });
});
