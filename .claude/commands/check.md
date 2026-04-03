Run all code quality checks:

1. Run `npx tsc --noEmit` for type-checking
2. Run `npx eslint .` for linting
3. Run `npx vitest run` for unit/component tests
4. Run `npx playwright test` for e2e tests
5. Run IDE diagnostics via `getDiagnostics` to catch any additional issues

Report a summary of all errors and warnings found. If everything passes, confirm all checks are clean.
