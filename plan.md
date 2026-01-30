# intl-typegen CLI Implementation Plan

**After completing any implementation work, run:** `pnpm format && pnpm build && pnpm check`

## Immediate Tasks: Error Handling

### Error Classification

Two error types with distinct responsibilities:

**`UsageError`** - User-correctable errors. The user can take action to fix the problem.
- Config file not found
- Invalid YAML syntax in config
- Schema validation failure
- Input directory not found
- No JSON files in input directory
- Invalid JSON in input file
- Top-level value is not an object
- Duplicate top-level keys across files
- Invalid `variableNameConvention` (missing `{name}`)
- Key collision (different keys produce same filename)
- File write failures (permission denied → fix permissions or change output path; disk full → free space)

**`PreconditionError`** - Internal programming errors. Calling code violated an API contract. Indicates a bug in our implementation.
- Function received invalid arguments that should never occur if code is correct
- Invariant violations

### 1. Create `UsageError` class (`src/usage-error.ts`)

```typescript
export class UsageError extends Error {
  name = "UsageError";

  constructor(message: string) {
    super(message);
  }
}
```

### 2. Migrate existing errors

Replace `PreconditionError` with `UsageError` in:
- `src/config/load-config.ts` - config file not found
- `src/generate/load-input-directory.ts` - all current `PreconditionError` usages

### 3. Add config loading error handling (`src/config/load-config.ts`)

Wrap `parseYaml()` and valibot `parse()` in try-catch blocks:

```typescript
// Invalid YAML syntax
let rawConfig: unknown;
try {
  rawConfig = parseYaml(content);
} catch (error) {
  throw new UsageError(
    `Invalid YAML in config file: ${configFilename}\n${error instanceof Error ? error.message : String(error)}`,
  );
}

// Schema validation failure
try {
  const config = parse(configSchema, rawConfig);
} catch (error) {
  throw new UsageError(
    `Invalid config: ${error instanceof ValiError ? error.issues.map((i) => i.message).join(", ") : String(error)}`,
  );
}
```

### 4. File write errors (`src/generate/generate.ts`)

Wrap `writeFileSync()` in try-catch and throw `UsageError`:

```typescript
try {
  writeFileSync(filepath, content);
} catch (error) {
  throw new UsageError(
    `Failed to write file: ${filepath}\n${error instanceof Error ? error.message : String(error)}`,
  );
}
```

### 5. Test Coverage

Add tests for:
- Invalid YAML syntax in config file → `UsageError`
- Missing required fields in config (schema validation) → `UsageError`
- File write failure (mock `writeFileSync` to throw) → `UsageError`
- Verify existing error cases throw `UsageError`, not `PreconditionError`

---

## Overview
CLI tool that generates TypeScript files from i18n JSON translation files. Each top-level key in the JSON becomes a separate TypeScript file with a type definition and hook function.

## Input/Output Specification

**Input directory structure:**
```
messages/
  ja-JP.json
  en-US.json
```

**Each locale file (e.g., `ja-JP.json`):**
```json
{
  "aaa": { "a1": "a1メッセージ", "a2": "a2メッセージ" },
  "fooBar": { "foo": "バー" },
  "bbb": {
    "b1": {
      "b1a": "b1a-メッセージ",
      "b1b": "b1b-メッセージ"
    },
    "b2": "b2-メッセージ"
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

- Each JSON filename (without extension) becomes a locale literal
- Variable name determined by `availableLocale.variableNameConvention` config (default: `{name}`)
  - `ja-JP.json` with `{name}` → `jaJP`
  - `ja-JP.json` with `{name}Schema` → `jaJPSchema`
  - `ja-JP.json` with `schemaOf{name}` → `schemaOfJaJP`
- Collection variable: `variableNameConvention` applied to `availableLocale.name` (e.g., `{name}Schema` with `availableLocale` → `availableLocaleSchema`)
- Type: PascalCase of `availableLocale.name` (e.g., `availableLocale` → `AvailableLocale`)

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

## Naming Conventions
| JSON Key | File Name | Type Name | Function Name |
|----------|-----------|-----------|---------------|
| `aaa` | `use-aaa-translation.ts` | `AaaDictionary` | `useAaaTranslation` |
| `fooBar` | `use-foo-bar-translation.ts` | `FooBarDictionary` | `useFooBarTranslation` |

### Identifier Sanitization
JSON keys that would produce invalid TypeScript identifiers are sanitized:
1. Keys starting with a digit: prefix with underscore (`123key` → `_123key`)
2. Keys containing invalid characters (hyphens, spaces, etc.): replace with underscores (`foo-bar` → `foo_bar`)
3. TypeScript reserved words: prefix with underscore (`class` → `_class`)

### Collision Detection
Before generating files, detect and report collisions:
1. After case conversion, if two keys produce the same filename, exit with an error listing the conflicting keys
2. Example: `fooBar` and `foo-bar` both become `use-foo-bar-translation.ts` → error

## Implementation

### Dependencies

See `package.json` for the current dependencies.

### File Structure

See the codebase for the current file structure.

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

**Path resolution:** All paths (`input`, `output`) are resolved relative to the config file location, not the working directory.
- `availableLocale` - Settings for `available-locale.ts` generation
  - `declaration` - Output format: `"typescript"` | `"valibot"` | `"zod"` (default: `"typescript"`)
  - `name` - Base name for the collection variable and type (default: `availableLocale`)
    - Variable: applies `variableNameConvention` pattern (e.g., with `{name}Schema`: `availableLocale` → `availableLocaleSchema`)
    - Type: PascalCase (e.g., `availableLocale` → `AvailableLocale`, `fooBar` → `FooBar`)
  - `variableNameConvention` - Pattern for locale variable names (default: `{name}`). The `{name}` placeholder is replaced with the locale name.
    - If `{name}` is at the start: camelCase (e.g., `{name}` → `jaJP`)
    - If `{name}` is not at the start: PascalCase (e.g., `schemaOf{name}` → `schemaOfJaJP`)

### CLI Interface
```bash
intl-typegen init          # Create config file
intl-typegen generate      # Generate TypeScript files (default command)
intl-typegen generate -n   # Dry-run: preview files without writing
intl-typegen               # Same as generate
intl-typegen -h            # Show help
intl-typegen -V            # Show version
```

**Dry-run mode (`-n, --dry-run`):**
- Lists files that would be created/overwritten
- Shows file content preview
- Does not write any files to disk

### Core Logic

1. **Parse CLI arguments** using `commander`
2. **Load config** from `intl-typegen.config.yaml` using `yaml` and validate with `valibot`
3. **Read input directory** and find all `.json` files
4. **Parse and merge JSON files**: Read each JSON file, merge top-level keys (error if duplicate keys across files)
5. **Generate `available-locale.ts`:**
   - Extract locale names from JSON filenames (e.g., `ja-JP.json` → `ja-JP`)
   - Generate exports for each locale using `availableLocale.variableNameConvention` and `availableLocale.declaration`
   - Generate collection variable and type using `availableLocale.name` (default: `availableLocale` and `AvailableLocale`)
6. **For each top-level key:**
   - Convert key to kebab-case for filename using `scule`
   - Convert key to PascalCase for type/function using `scule`
   - Recursively generate type definition from nested structure
   - Generate TypeScript content (exported type + exported function)
7. **Write output files** to specified directory

### Error Handling

**Non-existent paths:**
- Input directory not found: Exit with error message including the path
- Input directory contains no JSON files: Exit with error message
- Output directory not found: Create it recursively (like `mkdir -p`)

**Duplicate keys:**
- Same top-level key exists in multiple JSON files: Exit with error message listing the conflicting files

**Malformed files:**
- Invalid JSON in input file: Exit with error message including parse error details
- Invalid YAML in config file: Exit with error message including parse error details
- Schema validation failure: Exit with error message listing validation errors
- Top-level value is not an object: Exit with error message (primitives and arrays not supported at top level)

**Invalid configuration:**
- `availableLocale.variableNameConvention` missing `{name}` placeholder: Exit with error message

**File write failures:**
- Permission denied: Exit with error message including the path
- Disk full or I/O error: Exit with error message including system error details

## Decisions Made

- **Non-string values**: Infer raw type (`number`, `boolean`, `null`, `string[]`, etc.)
- **Formatting**: Tab indentation
- **Empty arrays**: Typed as `unknown[]`

## Build & Development

See `package.json` scripts.

## Verification

### Unit Tests
- `infer-type.ts`: Type inference for all JSON value types
- `generate-type-body.ts`: Type body generation for flat and nested structures
- `generate-locale-file.ts`: Locale file generation from filenames
- `get-output-filename.ts`: Filename generation and case conversion
- Variable name convention: `{name}` placeholder replacement with correct casing
- Identifier sanitization logic
- Collision detection logic

### Integration Tests
1. Basic flat key-value pairs
2. Nested object structures
3. Various value types (string, number, boolean, null, array)
4. Overwrite behavior (skip existing files when `overwrite: false`)
5. Dry-run mode (no files written, correct output displayed)
6. Locale file generation (`available-locale.ts` from input filenames)

### Error Case Tests
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
