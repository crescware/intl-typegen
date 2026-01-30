# intl-typegen CLI Implementation Plan

**After completing any implementation work, run:** `pnpm format && pnpm build && pnpm check`

**When moving files, use `git mv` to preserve history.**

---

## Completed

All features and tests have been implemented.

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
