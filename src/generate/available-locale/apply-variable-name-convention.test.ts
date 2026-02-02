import { describe, expect, test } from "vitest";

import { applyVariableNameConvention } from "./apply-variable-name-convention";

describe("applyVariableNameConvention()", () => {
  describe("when convention starts with {name}", () => {
    test("uses camelCase for locale name", () => {
      expect(applyVariableNameConvention("{name}", "en-US")).toBe("enUS");
    });

    test("applies suffix after camelCase name", () => {
      expect(applyVariableNameConvention("{name}Schema", "en-US")).toBe("enUSSchema");
    });
  });

  describe("when convention does not start with {name}", () => {
    test("uses PascalCase for locale name", () => {
      expect(applyVariableNameConvention("locale{name}", "en-US")).toBe("localeEnUS");
    });

    test("applies prefix before PascalCase name", () => {
      expect(applyVariableNameConvention("schemaOf{name}", "en-US")).toBe("schemaOfEnUS");
    });
  });
});
