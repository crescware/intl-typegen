# intl-typegen CLI Implementation Plan

## Overview
CLI tool that generates TypeScript files from i18n JSON translation files. Each top-level key in the JSON becomes a separate TypeScript file with a type definition and hook function (no exports).

## Input/Output Specification

**Input JSON (flat):**
```json
{
  "aaa": { "a1": "a1message", "a2": "a2message" },
  "fooBar": { "foo": "bar" }
}
```

**Input JSON (nested):**
```json
{
  "bbb": {
    "b1": {
      "b1a": "b1a-message",
      "b1b": "b1b-message"
    },
    "b2": "b2-message"
  }
}
```

**Output Files:**

`use-aaa-translation.ts`:
```typescript
type AaaDictionary = {
	a1: string;
	a2: string;
}

function useAaaTranslation() { /* TODO */ }
```

`use-bbb-translation.ts` (nested):
```typescript
type BbbDictionary = {
	b1: {
		b1a: string;
		b1b: string;
	};
	b2: string;
}

function useBbbTranslation() { /* TODO */ }
```

## Naming Conventions
| JSON Key | File Name | Type Name | Function Name |
|----------|-----------|-----------|---------------|
| `aaa` | `use-aaa-translation.ts` | `AaaDictionary` | `useAaaTranslation` |
| `fooBar` | `use-foo-bar-translation.ts` | `FooBarDictionary` | `useFooBarTranslation` |

### Top-Level Primitives
If a top-level key maps to a primitive value (string, number, boolean, null) instead of an object, generate a single file:
- File: `use-translation.ts`
- Type: `Dictionary` (with the primitive type)
- Function: `useTranslation()`

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

**Runtime:**
- `commander` - CLI argument parsing
- `scule` - Case conversion (kebabCase, pascalCase)
- `valibot` - Schema validation
- `yaml` - YAML parsing for config file

**Development:**
- `@typescript/native-preview` - Type checking (tsgo)
- `tsup` - Build/bundle for distribution
- `vitest` - Testing

### File Structure
```
src/
  config/
    config.ts             # Config schema definition
    config-filename.ts    # Config filename constant
    init.ts               # Init command
    load-config.ts        # Load and parse config file
  generate/
    generate.ts           # Generate command
    generate-file.ts      # Generate TypeScript file content
    generate-type-body.ts # Generate type body string
    get-output-filename.ts # Generate output filename
    infer-type.ts         # Infer TypeScript type from JSON value
    input.ts              # Input schema definition
    json-value.ts         # JSON value type and schema
  precondition-error.ts   # Custom error class
  index.ts                # CLI entry point
test/
  fixtures/               # Test fixtures
    basic/
    nested/
    types/
    overwrite-false/
    invalid-json/
    invalid-yaml/
    collision/
  unit/
    infer-type.test.ts
    generate-type-body.test.ts
    get-output-filename.test.ts
    sanitize-identifier.test.ts
    detect-collision.test.ts
  generate.integration.test.ts
  error-cases.integration.test.ts
```

### Configuration File

`intl-typegen.config.yaml`:
```yaml
input: ./locales/en.json
output: ./src/generated
overwrite: true
```

- `input` - Path to input JSON file (required)
- `output` - Output directory (required)
- `overwrite` - If `true`, overwrite existing files silently. If `false`, skip existing files with a warning.

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
3. **Read and parse JSON** using `node:fs` and validate with `valibot`
4. **For each top-level key:**
   - Convert key to kebab-case for filename using `scule`
   - Convert key to PascalCase for type/function using `scule`
   - Recursively generate type definition from nested structure
   - Generate TypeScript content (type + function, no exports)
5. **Write output files** to specified directory

### Error Handling

**Non-existent paths:**
- Input file not found: Exit with error message including the path
- Output directory not found: Create it recursively (like `mkdir -p`)

**Malformed files:**
- Invalid JSON in input file: Exit with error message including parse error details
- Invalid YAML in config file: Exit with error message including parse error details
- Schema validation failure: Exit with error message listing validation errors

**File write failures:**
- Permission denied: Exit with error message including the path
- Disk full or I/O error: Exit with error message including system error details

## Decisions Made

- **Non-string values**: Infer raw type (`number`, `boolean`, `null`, `string[]`, etc.)
- **Formatting**: Tab indentation, no `export` keywords
- **Empty arrays**: Typed as `unknown[]`

## Build & Development

**Type checking:**
```bash
pnpm check:types
```

**Lint:**
```bash
pnpm check:lint
```

**Test:**
```bash
pnpm test
```

**All checks:**
```bash
pnpm check
```

**Format:**
```bash
pnpm format
```

**Build for distribution:**
```bash
pnpm build
```

## Verification

### Unit Tests
- `infer-type.ts`: Type inference for all JSON value types
- `generate-type-body.ts`: Type body generation for flat and nested structures
- `get-output-filename.ts`: Filename generation and case conversion
- Identifier sanitization logic
- Collision detection logic

### Integration Tests
1. Basic flat key-value pairs
2. Nested object structures
3. Various value types (string, number, boolean, null, array)
4. Overwrite behavior (skip existing files when `overwrite: false`)
5. Dry-run mode (no files written, correct output displayed)

### Error Case Tests
1. Input file not found
2. Config file not found
3. Invalid JSON in input file
4. Invalid YAML in config file
5. Schema validation failure (missing required fields)
6. Key collision detection
7. Invalid identifier sanitization
