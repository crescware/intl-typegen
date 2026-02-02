# Plan: Generate next-intl Translation Types with Rich Text Support

## Overview

Modify the translation file generator to produce next-intl compatible types that:
1. Use `DeepReadonly` from `ts-essentials` for immutable dictionary types
2. Generate a callable `Translations` type with proper overloads
3. Parse XML-like tags from string values to generate typed `rich()` method signatures
4. Return `useTranslations(namespace)` from the generated hook

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

### Step 1: Create Tag Parser Utility

**File:** `src/generate/translation/extract-rich-tags.ts`

Create a function to extract XML-like tag names from translation strings:

```typescript
// Pattern: <tagName>...</tagName>
const TAG_PATTERN = /<([a-zA-Z][a-zA-Z0-9]*)>[^<]*<\/\1>/g;

export function extractRichTags(value: string): string[] {
  // Returns unique tag names: ["terms", "privacy"]
}
```

### Step 2: Create Rich Keys Analyzer

**File:** `src/generate/translation/analyze-rich-keys.ts`

Create a function to analyze dictionary and find keys with rich text:

```typescript
export interface RichKeyInfo {
  key: string;
  tags: string[];
}

export function analyzeRichKeys(obj: Record<string, JsonValue>): RichKeyInfo[] {
  // Recursively scan string values for tags
  // Return list of keys that have tags
}
```

### Step 3: Modify `generate-file.ts`

**File:** `src/generate/translation/generate-file.ts`

Replace current implementation to generate next-intl style output:

1. Add import statements (next-intl, react, ts-essentials)
2. Wrap dictionary type with `DeepReadonly<...>`
3. Generate `{Name}Translations` callable type:
   - Base call signature: `(key: keyof {Name}Dictionary): string`
   - Conditional `rich()` method (only if keys with tags exist)
4. Generate function that returns `useTranslations("{name}")`

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
- Nested objects with tagged strings

Update existing test fixtures in `test/fixtures/` to match new output format.

## Files to Modify

| File | Action |
|------|--------|
| `src/generate/translation/generate-file.ts` | Major rewrite |
| `src/generate/translation/extract-rich-tags.ts` | New file |
| `src/generate/translation/analyze-rich-keys.ts` | New file |
| `src/generate/translation/generate-rich-signature.ts` | New file |
| `src/generate/generate.test.ts` | Update expected outputs |
| `test/fixtures/*/expected/*.ts` | Update expected files |

## Key Design Decisions

1. **Omit `rich()` when no tags**: When no keys contain XML-like tags, the `rich()` method is not generated at all.

2. **next-intl only (for now)**: Generate next-intl style output only. Future configuration option can be added later.

3. **Tag extraction regex**: Use `<([a-zA-Z][a-zA-Z0-9]*)>[^<]*<\/\1>` to match self-closing XML-like tags.

4. **Per-key rich overloads**: Each key with tags gets its own typed options object matching its specific tags.

## Verification

1. Run `npm run build` to compile TypeScript
2. Run `npm test` to execute test suite
3. Create a test fixture with the example input and verify output matches expected format
4. Test edge cases:
   - Empty dictionary
   - No rich text tags
   - Multiple keys with different tags
   - Nested objects containing tagged strings
