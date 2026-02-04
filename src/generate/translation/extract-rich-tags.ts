import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";

import { assertExists } from "../../errors/assert-exists";
import { IcuParseError } from "./icu-parse-error";

export type ExtractRichTagsResult = Readonly<{
  tags: readonly string[];
  selfClosingTags: readonly string[];
}>;

const selfClosingTagPattern = /^<([a-zA-Z][a-zA-Z0-9]*)\/>/;

function extractSelfClosingTagName(value: string): string | null {
  const match = value.match(selfClosingTagPattern);
  if (match === null) {
    return null;
  }
  const tagName = match[1];
  assertExists(tagName);
  return tagName;
}

function visit(
  elements: readonly MessageFormatElement[],
  tags: Set<string>,
  selfClosingTags: Set<string>,
): void {
  for (const el of elements) {
    switch (el.type) {
      case TYPE.tag:
        tags.add(el.value);
        visit(el.children, tags, selfClosingTags);
        break;

      case TYPE.literal: {
        const tagName = extractSelfClosingTagName(el.value);
        if (tagName !== null) {
          selfClosingTags.add(tagName);
        }
        break;
      }

      case TYPE.plural:
        for (const option of Object.values(el.options)) {
          visit(option.value, tags, selfClosingTags);
        }
        break;

      case TYPE.select:
        for (const option of Object.values(el.options)) {
          visit(option.value, tags, selfClosingTags);
        }
        break;

      default:
        break;
    }
  }
}

export function extractRichTags(value: string): ExtractRichTagsResult {
  let ast: readonly MessageFormatElement[];
  try {
    ast = parse(value, { ignoreTag: false });
  } catch (e) {
    if (e instanceof Error) {
      throw new IcuParseError(e.message, { cause: e });
    }
    throw e;
  }

  const tags = new Set<string>();
  const selfClosingTags = new Set<string>();

  visit(ast, tags, selfClosingTags);

  return {
    tags: Array.from(tags),
    selfClosingTags: Array.from(selfClosingTags),
  };
}
