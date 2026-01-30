import { describe, expect, test } from "vitest";

import { inferType } from "./infer-type";

describe("inferType()", () => {
  test("returns 'null' for null", () => {
    expect(inferType(null, "\t")).toBe("null");
  });

  test("returns 'string' for string", () => {
    expect(inferType("hello", "\t")).toBe("string");
  });

  test("returns 'number' for number", () => {
    expect(inferType(42, "\t")).toBe("number");
  });

  test("returns 'boolean' for boolean", () => {
    expect(inferType(true, "\t")).toBe("boolean");
    expect(inferType(false, "\t")).toBe("boolean");
  });

  test("returns 'unknown[]' for empty array", () => {
    expect(inferType([], "\t")).toBe("unknown[]");
  });

  test("returns 'string[]' for string array", () => {
    expect(inferType(["a", "b", "c"], "\t")).toBe("string[]");
  });

  test("returns 'number[]' for number array", () => {
    expect(inferType([1, 2, 3], "\t")).toBe("number[]");
  });

  test("returns type body for object", () => {
    const result = inferType({ key: "value" }, "\t");
    expect(result).toBe("{\n\tkey: string;\n}");
  });

  test("returns nested type body for nested object", () => {
    const result = inferType({ outer: { inner: "value" } }, "\t");
    expect(result).toBe("{\n\touter: {\n\t\tinner: string;\n\t};\n}");
  });
});
