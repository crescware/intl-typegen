# intl-typegen CLI Implementation Plan

**After completing any implementation work, run:** `pnpm format && pnpm build && pnpm check`

**When moving files, use `git mv` to preserve history.**

---

## Remaining Tasks

### Features

1. **Identifier Sanitization** (`src/generate/sanitize-identifier.ts`)
   - Keys starting with a digit: prefix with underscore (`123key` → `_123key`)
   - Keys containing invalid characters (hyphens, spaces, etc.): replace with underscores (`foo-bar` → `foo_bar`)
   - TypeScript reserved words: prefix with underscore (`class` → `_class`)

2. **Collision Detection** (`src/generate/detect-collisions.ts`)
   - Before generating files, detect when two keys produce the same filename after case conversion
   - Exit with error listing the conflicting keys
   - Example: `fooBar` and `foo-bar` both become `use-foo-bar-translation.ts` → error

3. **Dry-run Mode** (`-n, --dry-run` flag for `generate` command)
   - Lists files that would be created/overwritten
   - Shows file content preview
   - Does not write any files to disk

### Tests

**Unit Tests (files do not exist):**
- `src/generate/translation/infer-type.test.ts`: Type inference for all JSON value types
- `src/generate/translation/generate-type-body.test.ts`: Type body generation for flat and nested structures
- `src/generate/get-output-filename.test.ts`: Filename generation and case conversion
- `src/generate/available-locale/apply-variable-name-convention.test.ts`: Variable name convention logic
- Identifier sanitization logic (after feature implemented)
- Collision detection logic (after feature implemented)

**Integration Tests (to add to `src/generate/generate.test.ts`):**
- Dry-run mode (no files written, correct output displayed)
- Locale file generation (`available-locale.ts` from input filenames) - no fixture currently tests this

**Error Case Tests:**
1. Input directory not found
2. Input directory contains no JSON files
3. Config file not found
4. Invalid JSON in input file
5. Invalid YAML in config file
6. Schema validation failure (missing required fields)
7. Invalid `availableLocale.variableNameConvention` (missing `{name}` placeholder)
8. Top-level value is not an object (primitive or array)
9. Duplicate top-level keys across files
10. Key collision detection (same output filename)
11. Invalid identifier sanitization

---

## Reference

### Error Classification

Two error types with distinct responsibilities:

**`UsageError`** (`src/errors/usage-error.ts`) - User-correctable errors. The user can take action to fix the problem.

**`PreconditionError`** (`src/errors/precondition-error.ts`) - Internal programming errors. Calling code violated an API contract. Indicates a bug in our implementation.

#### Error Handling Patterns

- Use `{ cause: e }` to preserve the original error chain
- Don't duplicate error messages in the message string - the cause contains the details
- Use `if (e instanceof Error)` pattern, not ternary operators
- If `e` is not an Error instance, just `throw e` - don't try to wrap anomalies
- Use `[...].join("\n")` for multi-line messages

### Input/Output Specification

**Input directory structure:**
```
messages/
  ja-JP.json
  en-US.json
```

**Each locale file (e.g., `ja-JP.json`):**
```json
{
  "aaa": { "a1": "a1-message", "a2": "a2-message" },
  "fooBar": { "foo": "bar" },
  "bbb": {
    "b1": {
      "b1a": "b1a-message",
      "b1b": "b1b-message"
    },
    "b2": "b2-message"
  }
}
```

All locale files must have the same structure. The generator reads all files, merges top-level keys (detecting duplicates), and generates TypeScript types from the structure.

**Output Files:**

`available-locale.ts` (generated from input filenames):

**`declaration: "typescript"` (default):**
```typescript
export const jaJP = "ja-JP" as const;
export const enUS = "en-US" as const;

export const availableLocale = [jaJP, enUS] as const;

export type AvailableLocale = typeof availableLocale[number];
```

**`declaration: "valibot"`:**
```typescript
import { type InferOutput, literal, picklist } from "valibot";

export const jaJPSchema = literal("ja-JP");
export const enUSSchema = literal("en-US");

export const availableLocaleSchema = picklist([jaJPSchema.literal, enUSSchema.literal]);

export type AvailableLocale = InferOutput<typeof availableLocaleSchema>;
```

**`declaration: "zod"`:**
```typescript
import { z } from "zod";

export const jaJPSchema = z.literal("ja-JP");
export const enUSSchema = z.literal("en-US");

export const availableLocaleSchema = z.union([jaJPSchema, enUSSchema]);

export type AvailableLocale = z.infer<typeof availableLocaleSchema>;
```

`use-aaa-translation.ts`:
```typescript
export type AaaDictionary = {
	a1: string;
	a2: string;
}

export function useAaaTranslation() { /* TODO */ }
```

`use-bbb-translation.ts` (nested):
```typescript
export type BbbDictionary = {
	b1: {
		b1a: string;
		b1b: string;
	};
	b2: string;
}

export function useBbbTranslation() { /* TODO */ }
```

### Naming Conventions

| JSON Key | File Name | Type Name | Function Name |
|----------|-----------|-----------|---------------|
| `aaa` | `use-aaa-translation.ts` | `AaaDictionary` | `useAaaTranslation` |
| `fooBar` | `use-foo-bar-translation.ts` | `FooBarDictionary` | `useFooBarTranslation` |

### Configuration File

`intl-typegen.config.yaml`:
```yaml
input: ./messages
output: ./src/generated
overwrite: true
availableLocale:
  declaration: "typescript"
  name: "availableLocale"
  variableNameConvention: "{name}"
```

- `input` - Path to directory containing JSON files (required). All `.json` files in the directory are processed.
- `output` - Output directory (required)
- `overwrite` - If `true`, overwrite existing files silently. If `false`, skip existing files with a warning.
- `availableLocale` - Settings for `available-locale.ts` generation
  - `declaration` - Output format: `"typescript"` | `"valibot"` | `"zod"` (default: `"typescript"`)
  - `name` - Base name for the collection variable and type (default: `availableLocale`)
  - `variableNameConvention` - Pattern for locale variable names (default: `{name}`)

**Path resolution:** All paths (`input`, `output`) are resolved relative to the config file location, not the working directory.

### CLI Interface

```bash
intl-typegen init          # Create config file
intl-typegen generate      # Generate TypeScript files (default command)
intl-typegen generate -n   # Dry-run: preview files without writing
intl-typegen               # Same as generate (implemented)
intl-typegen -h            # Show help (implemented)
intl-typegen -V            # Show version (implemented)
```

### Decisions Made

- **Non-string values**: Infer raw type (`number`, `boolean`, `null`, `string[]`, etc.)
- **Formatting**: Tab indentation
- **Empty arrays**: Typed as `unknown[]`
