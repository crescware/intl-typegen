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

### Step 7: Add New Test Cases [TODO]

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
- Warning: Malformed ICU syntax (parse error)
- Warning: Self-closing tags `<br/>`

### Step 8: Display Report in `generate.ts` [TODO]

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

### Step 9: Documentation for `json-value.ts` [TODO]

**File:** `src/generate/translation/json-value.ts`

Add comment explaining schema permissiveness:

```typescript
/**
 * Represents any valid JSON value.
 *
 * Note: This schema accepts all JSON types for parsing flexibility, but only
 * `string` values are valid for translation messages at the top level.
 * Other types (number, boolean, null, array, nested object) will be reported
 * as ignored properties during the generation phase with explanatory reasons.
 */
export type JsonValue = ...
```

## Files to Modify

| File | Action |
|------|--------|
| `src/generate/translation/json-value.ts` | Add documentation comment |
| `src/generate/generate.ts` | Collect and display report (ignored + warnings) |
| `src/generate/generate.test.ts` | Add new test cases |

## Key Design Decisions

1. **Omit `rich()` when no tags**: When no keys contain XML-like tags, the `rich()` method is not generated at all.

2. **next-intl only (for now)**: Generate next-intl style output only. Future configuration option can be added later.

3. **Use FormatJS parser**: Use `@formatjs/icu-messageformat-parser` to parse ICU messages and extract tags from the AST. This ensures compatibility with next-intl which uses the same parser.

4. **Per-key rich overloads**: Each key with tags gets its own typed options object matching its specific tags.

5. **Flat keys only**: Only direct string properties are valid translation messages. Nested objects are not supported and are reported as ignored properties.

6. **Comprehensive warnings**: Users are warned when output is not generated as expected:
   - Malformed ICU syntax (parse error caught, key skipped)
   - Self-closing tags like `<br/>` (treated as literals by FormatJS)

7. **Strict value types**: Only strings are accepted at the top level. Other JSON types are ignored with reasons:
   - `number` - "Number values are not valid translation messages"
   - `boolean` - "Boolean values are not valid translation messages"
   - `null` - "Null values are not valid translation messages"
   - `array` - "Array values are not supported"
   - `object` - "Nested objects are not supported"

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
     - Number, boolean, null, array, nested object values
   - Warnings are displayed for:
     - Malformed ICU syntax (parse error)
     - Self-closing tags `<br/>`
