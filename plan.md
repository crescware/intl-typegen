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
};

function useAaaTranslation() {}
```

`use-bbb-translation.ts` (nested):
```typescript
type BbbDictionary = {
    b1: {
        b1a: string;
        b1b: string;
    };
    b2: string;
};

function useBbbTranslation() {}
```

## Naming Conventions
| JSON Key | File Name | Type Name | Function Name |
|----------|-----------|-----------|---------------|
| `aaa` | `use-aaa-translation.ts` | `AaaDictionary` | `useAaaTranslation` |
| `fooBar` | `use-foo-bar-translation.ts` | `FooBarDictionary` | `useFooBarTranslation` |

## Implementation

### Dependencies

**Runtime:**
- `yaml` - YAML parsing for config file

**Development:**
- `@typescript/native-preview@7.0.0-dev.20260124.1` - Type checking (tsgo)
- `tsup` - Build/bundle for distribution

### File Structure
```
src/
  index.ts          # CLI entry point
  generator.ts      # Core generation logic
  naming.ts         # Naming utilities (camelToKebab, toPascalCase)
```

### Configuration File

`intl-typegen.config.yaml`:
```yaml
input: ./locales/en.json
output: ./src/generated
```

- `input` - Path to input JSON file (required)
- `output` - Output directory (required)

### CLI Interface
```bash
intl-typegen
```

Reads `intl-typegen.config.yaml` from current directory.

### Core Logic

1. **Parse CLI arguments** using `node:util.parseArgs`
2. **Read and parse JSON** using `node:fs`
3. **For each top-level key:**
   - Convert key to kebab-case for filename: `fooBar` -> `foo-bar`
   - Convert key to PascalCase for type/function: `fooBar` -> `FooBar`
   - Recursively generate type definition from nested structure
   - Generate TypeScript content (type + function, no exports)
4. **Write output files** to specified directory

### Files to Create

1. **src/naming.ts** - String utilities
   - `camelToKebab(str)`: Convert camelCase to kebab-case
   - `toPascalCase(str)`: Convert to PascalCase

2. **src/generator.ts** - Core logic
   - `generateTypeDefinition(obj, indent)`: Recursively generate type string
   - `generateHookFunction(name)`: Generate function string
   - `generateFile(name, obj)`: Combine type + function

3. **src/index.ts** - CLI entry point
   - Parse arguments
   - Read JSON
   - Generate and write files

## Open Issues (TBD)

### Issue 1: Non-string values
What should happen when a JSON value is not a string (e.g., `123`, `true`, `["a","b"]`, `null`)?

Options:
- Type as `any`
- Infer actual type (`number`, `boolean`, `string[]`, `null`)
- Throw error

### Issue 2: Output file conflicts
What should happen when an output file already exists?

Options:
- Overwrite silently
- Skip with warning
- Throw error

## Decisions Made

- **Nested objects**: Recursively typed (supported at any depth)
- **Exports**: None (no `export` keywords)
- **CLI source code**: TypeScript
- **Formatting**: Tab indentation

## Decisions Pending

- **Hook function body**: Empty, return type, parameters, or implementation? (TBD)

## Build & Development

**Type checking:**
```bash
pnpm tsgo
```

**Build for distribution:**
```bash
pnpm tsup src/index.ts --format esm
```

**Package.json bin field:**
```json
{
  "bin": {
    "intl-typegen": "./dist/index.js"
  }
}
```

## Verification
1. Create sample input JSON
2. Run CLI against it
3. Verify generated files match expected format
