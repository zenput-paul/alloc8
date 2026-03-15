Run all code quality checks:

1. Run `npx tsc --noEmit` for type-checking
2. Run `npx eslint src/` for linting (skip auto-generated files like dev-dist/)
3. Run `npx vitest run` for unit/component tests
4. Run IDE diagnostics via `getDiagnostics` to catch any additional issues

Report a summary of all errors and warnings found. If everything passes, confirm all checks are clean.
