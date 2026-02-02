# Plan: Generate next-intl Translation Types with Rich Text Support

## Overview

Modify the translation file generator to produce next-intl compatible types that:
1. Use `DeepReadonly` from `ts-essentials` for immutable dictionary types
2. Generate a callable `Translations` type with proper overloads
3. Parse XML-like tags from string values to generate typed `rich()` method signatures
4. Return `useTranslations(namespace)` from the generated hook

**Note:** Generated files require `next-intl`, `react`, and `ts-essentials` as dependencies in the user's project. These are not dependencies of intl-typegen itself.

## Expected Output Example

Input:
```json
{
    "HomePage": {
        "termsAgreement": "I agree to the <terms>Terms</terms> and <privacy>Privacy</privacy>",
        "agreementMessage": "Please agree to the above"
    }
}
```

Output:
```typescript
import { useTranslations } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import type { DeepReadonly, StrictExtract } from "ts-essentials";

type HomePageDictionary = DeepReadonly<{
    termsAgreement: string;
    agreementMessage: string;
}>;

type HomePageTranslations = DeepReadonly<{
    (key: keyof HomePageDictionary): string;
    rich(
        key: StrictExtract<keyof HomePageDictionary, "termsAgreement">,
        options: {
            terms: (chunk: ReactNode) => ReactElement;
            privacy: (chunk: ReactNode) => ReactElement;
        },
    ): ReactNode;
}>;

export function useHomePageTranslations(): HomePageTranslations {
    return useTranslations("HomePage");
}
```

## Implementation Steps

### Step 1: Add Dependency and Create Tag Parser Utility

**Add dependency:**
```bash
pnpm add @formatjs/icu-messageformat-parser
```

**File:** `src/generate/translation/extract-rich-tags.ts`

Use the FormatJS ICU parser to extract tag names from translation strings. This ensures compatibility with next-intl since both use the same underlying parser.

```typescript
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";

export interface ExtractRichTagsResult {
  tags: string[];
  selfClosingTags: string[];
  parseError: string | null;
}

export function extractRichTags(value: string): ExtractRichTagsResult {
  let ast: MessageFormatElement[];
  try {
    ast = parse(value, { ignoreTag: false });
  } catch (error) {
    return {
      tags: [],
      selfClosingTags: [],
      parseError: error instanceof Error ? error.message : String(error),
    };
  }

  const tags = new Set<string>();
  const selfClosingTags = new Set<string>();

  function visit(elements: MessageFormatElement[]): void {
    for (const el of elements) {
      if (el.type === TYPE.tag) {
        tags.add(el.value);
        visit(el.children);
      }
      // Self-closing tags are parsed as literals with format "<name/>"
      if (el.type === TYPE.literal && typeof el.value === "string") {
        const match = el.value.match(/^<([a-zA-Z][a-zA-Z0-9]*)\/>/);
        if (match) {
          selfClosingTags.add(match[1]);
        }
      }
      // Handle plural/select which can contain nested messages
      if ("options" in el) {
        for (const option of Object.values(el.options)) {
          visit(option.value);
        }
      }
    }
  }

  visit(ast);
  return {
    tags: Array.from(tags),
    selfClosingTags: Array.from(selfClosingTags),
    parseError: null,
  };
}
```

### Step 2: Create Rich Keys Analyzer

**File:** `src/generate/translation/analyze-rich-keys.ts`

Analyze direct string properties only. Collect warnings for unsupported patterns.

```typescript
import { extractRichTags } from "./extract-rich-tags";
import type { JsonValue } from "./json-value";

export interface RichKeyInfo {
  key: string;
  tags: string[];
}

export interface IgnoredProperty {
  key: string;
  reason: string;
}

export interface AnalyzeRichKeysResult {
  richKeys: RichKeyInfo[];
  warnings: string[];
  ignoredProperties: IgnoredProperty[];
}

export function analyzeRichKeys(
  obj: Record<string, JsonValue>,
  parentPath = "",
): AnalyzeRichKeysResult {
  const richKeys: RichKeyInfo[] = [];
  const warnings: string[] = [];
  const ignoredProperties: IgnoredProperty[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;

    if (typeof value === "string") {
      const result = extractRichTags(value);

      // Warning: ICU parse error
      if (result.parseError) {
        warnings.push(
          `Key "${currentPath}" could not be parsed as ICU message: ${result.parseError}. Treating as plain string.`
        );
        continue;
      }

      // Warning: Self-closing tags
      if (result.selfClosingTags.length > 0) {
        warnings.push(
          `Key "${currentPath}" contains self-closing tag(s) <${result.selfClosingTags.join("/>, <")}/> which are not supported for rich text.`
        );
      }

      if (result.tags.length > 0) {
        if (parentPath) {
          // Warning: Nested string with tags
          warnings.push(
            `Nested key "${currentPath}" contains rich text tags [${result.tags.join(", ")}] but nested keys are not supported.`
          );
        } else {
          // Top-level string with tags - collect
          richKeys.push({ key, tags: result.tags });
        }
      }
    } else if (Array.isArray(value)) {
      // Ignored: Array values
      ignoredProperties.push({
        key: currentPath,
        reason: "Array values are not supported",
      });
      // Additional warning if array contains tagged strings
      const arrayTags = new Set<string>();
      for (const item of value) {
        if (typeof item === "string") {
          const result = extractRichTags(item);
          result.tags.forEach(tag => arrayTags.add(tag));
        }
      }
      if (arrayTags.size > 0) {
        warnings.push(
          `Key "${currentPath}" is an array containing rich text tags [${Array.from(arrayTags).join(", ")}] but arrays are not supported.`
        );
      }
    } else if (typeof value === "number") {
      ignoredProperties.push({
        key: currentPath,
        reason: "Number values are not valid translation messages",
      });
    } else if (typeof value === "boolean") {
      ignoredProperties.push({
        key: currentPath,
        reason: "Boolean values are not valid translation messages",
      });
    } else if (value === null) {
      ignoredProperties.push({
        key: currentPath,
        reason: "Null values are not valid translation messages",
      });
    } else if (typeof value === "object") {
      // Recursively check nested objects for warnings and ignored properties
      // Note: richKeys are not propagated because nested strings with tags become warnings
      const nested = analyzeRichKeys(value as Record<string, JsonValue>, currentPath);
      warnings.push(...nested.warnings);
      ignoredProperties.push(...nested.ignoredProperties);
    }
  }

  return { richKeys, warnings, ignoredProperties };
}
```

**Warning types:**
1. **Parse error**: ICU syntax is malformed
2. **Self-closing tags**: `<br/>` not supported for rich text
3. **Nested keys**: Tags in nested objects not supported
4. **Arrays**: Tags in array items not supported

### Step 3: Modify `generate-file.ts`

**File:** `src/generate/translation/generate-file.ts`

Replace current implementation to generate next-intl style output:

1. Add import statements (next-intl, react, ts-essentials)
2. Wrap dictionary type with `DeepReadonly<...>`
3. Generate `{Name}Translations` callable type:
   - Base call signature: `(key: keyof {Name}Dictionary): string`
   - Conditional `rich()` method (only if keys with tags exist)
4. Generate function that returns `useTranslations("{name}")`
5. Return both generated content and warnings from `analyzeRichKeys`

```typescript
import type { IgnoredProperty } from "./analyze-rich-keys";

export interface GenerateFileResult {
  content: string;
  warnings: string[];
  ignoredProperties: IgnoredProperty[];
}

export function generateFile(name: string, obj: Record<string, JsonValue>): GenerateFileResult {
  const { richKeys, warnings, ignoredProperties } = analyzeRichKeys(obj);
  // ... generate content using richKeys (excluding ignored properties from type)
  return { content, warnings, ignoredProperties };
}
```

### Step 3b: Update `generate-type-body.ts`

**File:** `src/generate/translation/generate-type-body.ts`

Modify to skip non-string/non-object values when generating type body:

```typescript
export function generateTypeBody(obj: { [key: string]: JsonValue }, indent = "\t"): string {
  const closingIndent = indent.slice(0, -1) || "";

  const lines = Object.entries(obj)
    .filter(([, value]) => {
      // Only include strings and nested objects
      if (typeof value === "string") return true;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) return true;
      return false;
    })
    .map(([key, value]) => {
      const type = inferType(value, indent + "\t");
      return `${indent}${formatKey(key)}: ${type};`;
    });

  return `{\n${lines.join("\n")}\n${closingIndent}}`;
}
```

This filtering is consistent with `analyzeRichKeys` which reports the same value types as ignored.

### Step 4: Generate Rich Method Signature

**File:** `src/generate/translation/generate-rich-signature.ts`

Create a function to generate the `rich()` method type signature:

```typescript
export function generateRichSignature(
  richKeys: RichKeyInfo[],
  dictionaryName: string,
  indent: string
): string {
  // Generate overloaded rich() signatures for each key with tags
  // Each key gets its own signature with specific options type
}
```

### Step 5: Update Tests

**File:** `src/generate/generate.test.ts`

Add new test cases:
- Keys with single tag
- Keys with multiple tags
- Mixed keys (some with tags, some without)
- No keys with tags (should omit `rich()` method)
- Ignored: Number values
- Ignored: Boolean values
- Ignored: Null values
- Ignored: Array values
- Warning: Nested objects with tags
- Warning: Self-closing tags `<br/>`
- Warning: Arrays with tagged strings
- Warning: Malformed ICU syntax (parse error)

Update existing test fixtures in `test/fixtures/` to match new output format.

### Step 6: Display Report in `generate.ts`

**File:** `src/generate/generate.ts`

Collect warnings and ignored properties from all `generateFile` calls and display at the end:

```typescript
import type { IgnoredProperty } from "./translation/analyze-rich-keys";

const allWarnings: string[] = [];
const allIgnoredProperties: IgnoredProperty[] = [];

for (const [name, obj] of Object.entries(data)) {
  const { content, warnings, ignoredProperties } = generateFile(name, obj);
  allWarnings.push(...warnings);
  allIgnoredProperties.push(...ignoredProperties);
  // ... write file
}

// Display report at the end
if (allIgnoredProperties.length > 0) {
  console.warn("\nIgnored properties:");
  for (const { key, reason } of allIgnoredProperties) {
    console.warn(`  - "${key}": ${reason}`);
  }
}

if (allWarnings.length > 0) {
  console.warn("\nWarnings:");
  for (const warning of allWarnings) {
    console.warn(`  - ${warning}`);
  }
}
```

**Example output:**
```
Ignored properties:
  - "HomePage.maxRetries": Number values are not valid translation messages
  - "HomePage.enabled": Boolean values are not valid translation messages
  - "HomePage.items": Array values are not supported

Warnings:
  - Key "HomePage.greeting" contains self-closing tag(s) <br/> which are not supported for rich text.
```

## Files to Modify

| File | Action |
|------|--------|
| `package.json` | Add `@formatjs/icu-messageformat-parser` dependency |
| `src/generate/translation/json-value.ts` | Add documentation comment |
| `src/generate/translation/generate-file.ts` | Major rewrite |
| `src/generate/translation/generate-type-body.ts` | Skip non-string/non-object values (number, boolean, null, array) |
| `src/generate/translation/extract-rich-tags.ts` | New file |
| `src/generate/translation/analyze-rich-keys.ts` | New file |
| `src/generate/translation/generate-rich-signature.ts` | New file |
| `src/generate/generate.ts` | Collect and display report (ignored + warnings) |
| `src/generate/generate.test.ts` | Update expected outputs |
| `test/fixtures/*/expected/*.ts` | Update expected files |

### Documentation: `json-value.ts`

**File:** `src/generate/translation/json-value.ts`

Add comment explaining schema permissiveness:

```typescript
/**
 * Represents any valid JSON value.
 *
 * Note: This schema accepts all JSON types for parsing flexibility, but only
 * `string` and nested `object` values are valid for translation messages.
 * Other types (number, boolean, null, array) will be reported as ignored
 * properties during the generation phase with explanatory reasons.
 */
export type JsonValue = ...
```

## Key Design Decisions

1. **Omit `rich()` when no tags**: When no keys contain XML-like tags, the `rich()` method is not generated at all.

2. **next-intl only (for now)**: Generate next-intl style output only. Future configuration option can be added later.

3. **Use FormatJS parser**: Use `@formatjs/icu-messageformat-parser` to parse ICU messages and extract tags from the AST. This ensures compatibility with next-intl which uses the same parser.

4. **Per-key rich overloads**: Each key with tags gets its own typed options object matching its specific tags.

5. **Flat keys only**: Only direct string properties are analyzed for rich text tags. Nested objects are ignored (no dot notation like `"section.title"`).

6. **Comprehensive warnings**: Users are warned when output is not generated as expected:
   - Nested keys with tags (not supported)
   - Self-closing tags like `<br/>` (treated as literals by FormatJS)
   - Arrays containing tagged strings (not supported)
   - Malformed ICU syntax (treated as plain string)

7. **Strict value types**: Only strings and nested objects are accepted. Other JSON types are ignored with reasons:
   - `number` - "Number values are not valid translation messages"
   - `boolean` - "Boolean values are not valid translation messages"
   - `null` - "Null values are not valid translation messages"
   - `array` - "Array values are not supported" (with additional warning if contains tags)

## Verification

1. Run `pnpm format` to format code
2. Run `pnpm build` to compile TypeScript
3. Run `pnpm check` to run linting, type checking, and tests
4. Create a test fixture with the example input and verify output matches expected format
5. Test edge cases:
   - Empty dictionary
   - No rich text tags
   - Multiple keys with different tags
   - Ignored properties are reported for:
     - Number, boolean, null, array values
   - Warnings are displayed for:
     - Nested objects with tags
     - Self-closing tags `<br/>`
     - Arrays containing tagged strings
     - Malformed ICU syntax
