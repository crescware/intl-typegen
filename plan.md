# intl-typegen CLI Implementation Plan

**After completing any implementation work, run:** `pnpm format && pnpm build && pnpm check`

**When moving files, use `git mv` to preserve history.**

---

## Remaining Features

### 1. Dry-run Mode (`-n, --dry-run` flag for `generate` command)

Add `--dry-run` (short: `-n`) option to the `generate` command:

- Lists files that would be created/overwritten
- Shows file content preview
- Does not write any files to disk

### 2. Identifier Sanitization (`src/generate/sanitize-identifier.ts`)

Sanitize JSON keys to produce valid TypeScript identifiers:

- Keys starting with a digit: prefix with underscore (`123key` → `_123key`)
- Keys containing invalid characters (hyphens, spaces, etc.): replace with underscores (`foo-bar` → `foo_bar`)
- TypeScript reserved words: prefix with underscore (`class` → `_class`)

**TypeScript reserved words to handle:**
`break`, `case`, `catch`, `class`, `const`, `continue`, `debugger`, `default`, `delete`, `do`, `else`, `enum`, `export`, `extends`, `false`, `finally`, `for`, `function`, `if`, `import`, `in`, `instanceof`, `new`, `null`, `return`, `super`, `switch`, `this`, `throw`, `true`, `try`, `typeof`, `var`, `void`, `while`, `with`, `yield`, `let`, `static`, `implements`, `interface`, `package`, `private`, `protected`, `public`

### 3. Collision Detection (`src/generate/detect-collisions.ts`)

Before generating files, detect when two keys produce the same filename after case conversion:

- Exit with error listing the conflicting keys
- Example: `fooBar` and `foo-bar` both become `use-foo-bar-translation.ts` → error

---

## Remaining Tests

### Unit Tests (files do not exist)

| File | Description |
|------|-------------|
| `src/generate/translation/infer-type.test.ts` | Type inference for all JSON value types |
| `src/generate/translation/generate-type-body.test.ts` | Type body generation for flat and nested structures |
| `src/generate/get-output-filename.test.ts` | Filename generation and case conversion |
| `src/generate/available-locale/apply-variable-name-convention.test.ts` | Variable name convention logic |
| `src/generate/sanitize-identifier.test.ts` | Identifier sanitization (after feature implemented) |
| `src/generate/detect-collisions.test.ts` | Collision detection (after feature implemented) |

### Integration Tests (to add to `src/generate/generate.test.ts`)

- Locale file generation (`available-locale.ts` from input filenames)
- Dry-run mode (no files written, correct output displayed)

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

---

## Reference

### Error Handling Patterns

- Use `UsageError` for user-correctable errors
- Use `PreconditionError` for internal programming errors (API contract violations)
- Use `{ cause: e }` to preserve the original error chain
- Don't duplicate error messages in the message string - the cause contains the details
- Use `if (e instanceof Error)` pattern, not ternary operators
- If `e` is not an Error instance, just `throw e` - don't try to wrap anomalies
- Use `[...].join("\n")` for multi-line messages
