# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Investment portfolio management PWA. React + TypeScript using Vite, MUI (Material UI), and vite-plugin-pwa. Node.js 22 (managed via asdf).

## Domain

The app lets users define an investment portfolio and calculate how to distribute new investments.

- A **Portfolio** contains groups.
- A **Group** has a target percentage of the portfolio and a deviation threshold (acceptable drift from target). All group percentages must total 100%.
- An **Asset** belongs to exactly one group (via `groupId`). Assets are stored separately from the portfolio, not nested inside groups.
  - Type `unit`: purchased in discrete units at a price (e.g. stocks).
  - Type `fixed`: a fixed monetary amount in a fixed-income investment.
  - An asset can be **deactivated** — it still counts toward its group's current value but is excluded when calculating new investments.

### Investment calculation

The user provides: current value of each asset, unit prices for unit-type assets, and the total amount to invest. The app distributes the new investment across groups respecting target percentages and deviation thresholds, then determines how many units to buy (for unit-type) or how much to allocate (for fixed-type). After initial allocation, leftover from unit-type rounding is reinvested by buying additional units, prioritizing groups furthest below target. Any remaining amount after unit reinvestment is distributed to active fixed-type assets in groups still below their threshold.

**Constraints:**

- Group target percentages must total exactly 100%.
- Every group must have a target percentage > 0%.
- Deviation threshold must be less than the target percentage.
- Every group must have at least one active asset.
- The calculator throws if constraints are violated; the UI validates in dialogs.

## Data model

- `Group { id, name, targetPercentage, deviationThreshold }`
- `Asset { id, groupId, name, type: 'unit' | 'fixed', active }`
- Assets reference groups; portfolio only contains groups
- Data persisted to IndexedDB via RxDB

## Workflow

- Work on feature branches, open a PR to merge into `main` — pushes to `main` trigger a production deploy
- Never change application behavior to make a test pass — fix the test to match intended behavior, or clarify the expected behavior first
- When making code changes, always create or update related tests
- After changes, check if CLAUDE.md needs updating (new files, patterns, architecture, commands)
- Run `/check` before every commit — do not commit if checks fail
- Run `/i18n` after adding or modifying UI strings to catch missing translations
- Work one phase at a time — complete and verify before moving to the next
- Prefer explicit behavior over implicit defaults (no silent coercion, require intentional values)
- All interactive elements without visible text (IconButtons, icon-only controls) must have an `aria-label` using an i18n key — for both accessibility and e2e testability
- Prefer a single JSX return per component — use responsive `sx` props or conditional rendering over duplicated mobile/desktop branches
- Spanish translations (`es.json`) should be reviewed by a native speaker — flag regional variations

## Commands

- `npm run dev` - Start dev server
- `npm run build` - Type-check and build for production
- `npm run preview` - Preview production build
- `npx tsc --noEmit` - Type-check only
- `npx vitest run` - Run unit/component tests
- `npx vitest run <path>` - Run specific test file
- `npx playwright test` - Run e2e tests
- `npx prettier --write .` - Format all files with Prettier
- `npx prettier --check .` - Check formatting without writing

### Slash commands

- `/check` - Run type-check, lint, tests, and IDE diagnostics
- `/test` - Run Vitest (optionally with a file path)
- `/commit` - Update docs, run checks, then commit and push
- `/pr` - Push branch and generate PR title/description
- `/branch <name>` - Start a new feature branch from latest main
- `/review` - Run `@pr-reviewer` on the current branch
- `/audit` - Run `@security-audit` on dependencies and code
- `/i18n` - Check translation files for missing or unused keys
- `/cleanup` - Find dead code: unused types, exports, and i18n keys
- `/simplify` - Review changed code for reuse, quality, and efficiency (built-in)
- `/update-docs` - Update CLAUDE.md based on recent changes

### Agents

Custom subagents in `.claude/agents/`, invoked with `@name`:

- `@pr-reviewer` - Review branch changes for correctness, test quality, and consistency (Sonnet)
- `@security-audit` - Audit dependencies and code for security vulnerabilities (Sonnet)
- `@i18n-checker` - Check translations for missing/unused keys and quality issues (Sonnet)
- `@product-manager` - Brainstorm features, discuss product direction, evaluate UX (Opus)

## Architecture

- `src/main.tsx` - Entry point; sets up MUI ThemeProvider, CssBaseline, and DatabaseProvider
- `src/App.tsx` - Responsive nav shell: BottomNavigation on mobile, Tabs in AppBar on desktop; switches between Portfolio and Calculator views
- `src/components/portfolio/PortfolioView.tsx` - Portfolio view: group list, validation banner (% must total 100), CRUD
- `src/components/portfolio/GroupCard.tsx` - Expandable card for a group, lists assets with Switch toggle, three-dot menu for edit/delete
- `src/components/portfolio/GroupDialog.tsx` - Create/edit group dialog with validation and `%` InputAdornment
- `src/components/portfolio/AssetDialog.tsx` - Create/edit asset dialog with Units/Fixed amount type switching
- `src/components/calculator/CalculatorView.tsx` - Calculator layout shell: two-column on desktop (form left, results right), single-column on mobile with scroll-to-results after calculation
- `src/components/calculator/useCalculator.ts` - Calculator state hook: loads groups/assets from RxDB, manages form state, runs `calculateAllocations`, exposes `displayAllocations`/`displayRemainder` for the view
- `src/components/calculator/CalculatorInputForm.tsx` - Calculator input form: grouped asset fields (current value + unit price), amount to invest, calculate/reset buttons, required field validation
- `src/components/calculator/CalculatorResults.tsx` - Results table grouped by group with percentage stats (current → after, color-coded by deviation from target), subtotals by asset type, remainder alert
- `src/lib/calculator.ts` - Pure investment calculation function (`calculateAllocations`); no side effects, no UI dependencies. Exports `ON_TARGET_EPSILON` (0.05 percentage points) used by `CalculatorResults` to determine on-target display
- `src/lib/formatNumber.ts` - Locale-aware number formatting (`formatCurrency`, `formatUnits`) using `Intl.NumberFormat`
- `src/types.ts` - Core domain types (Group, Asset, AssetInput, AssetAllocation, GroupStats)
- `src/db/index.ts` - RxDB database creation and collection type exports
- `src/db/schemas/group.ts` - Group collection schema
- `src/db/schemas/asset.ts` - Asset collection schema (uses `ref: 'groups'` for groupId)
- `src/db/DatabaseProvider.tsx` - Initializes RxDB and provides it via rxdb-hooks `Provider`
- MUI's `createTheme()` in main.tsx controls the global theme (primary: `#2E7D32` dark green)
- `.github/workflows/deploy.yml` - GitHub Actions workflow: runs tests, builds, and deploys to GitHub Pages on push to `main`
- Styling is done via MUI's `sx` prop and component props (no separate CSS files)
- MUI v7: use `slotProps` / `slots` API — never use deprecated props (`inputProps`, `InputProps`, `InputLabelProps`, etc.)
- Dialogs use a key pattern: outer Dialog + inner form component that remounts via key on close
- Dialog forms are wrapped in `<form>` with `onSubmit` for Enter key support
- Destructive actions (delete group/asset) use a confirmation dialog
- Use `useRxCollection` and `useRxQuery` from `rxdb-hooks` to read data in components
- Use type-only imports (`import type`) for types — `verbatimModuleSyntax` is enabled

## Testing

- **Vitest** + **jsdom** for unit/component tests (`vitest.config.ts`)
- **React Testing Library** for component rendering and interaction
- **Playwright** for e2e tests (`playwright.config.ts`, `e2e/` directory)
- `e2e/helpers.ts` — shared utilities: `clearDatabase`, `createGroup`, `addAsset`, `expandGroup`, `navigateTo`, `createStandardPortfolio`
- `e2e/portfolio.spec.ts` — portfolio CRUD tests (group and asset create/edit/delete, deactivation, validation, cascade delete)
- `e2e/calculator.spec.ts` — calculator flow tests (warnings, calculation with value verification, reset, inactive assets, remainder)
- `e2e/i18n.spec.ts` — language switching test
- E2e selectors rely on `aria-label`, `getByRole`, and `getByLabel` — keep aria-labels on interactive elements that lack visible text
- `vitest.config.ts` excludes `e2e/**` so Playwright tests aren't picked up by Vitest
- Test setup file: `src/test-setup.ts` (imports jest-dom matchers)
- `CalculatorView` tests mock `useCalculator` (layout-only tests); `useCalculator` tests mock `rxdb-hooks` with a sentinel pattern that tracks collection names to distinguish groups vs assets queries

## Internationalization (i18n)

- `react-i18next` + `i18next` with `i18next-browser-languagedetector`
- `src/i18n/index.ts` — i18n config, auto-detects browser language, falls back to English
- `src/i18n/en.json` — English translations
- `src/i18n/es.json` — Spanish translations
- All UI strings use `t('key')` from `useTranslation()` — no hardcoded strings in components
- Language switcher in the app bar (globe icon)
- i18next pluralization via `_one` / `_other` suffixes (e.g. `assetCount`)
- Imported in `src/main.tsx` (side-effect import) and `src/test-setup.ts` for tests

## Security

- All data is local-only (IndexedDB via RxDB) — no server, no network exposure
- Current data (group names, percentages, allocation plans) is low-risk planning data
- IndexedDB is not encrypted — acceptable for current scope
- If the app ever stores real account numbers or balances, add RxDB field encryption
- RxDB cleanup plugin purges soft-deleted documents on startup (`src/db/index.ts`)

## Formatting

- **Prettier** with single-quote config (`.prettierrc.json`)
- **eslint-config-prettier** disables ESLint rules that conflict with Prettier
- Pre-commit hook (Husky + lint-staged) runs ESLint and Prettier on staged files
- Run `npx prettier --write .` to format the entire codebase

## Deployment

- Hosted on **GitHub Pages** at `https://zenput-paul.github.io/alloc8/`
- Auto-deploys on push to `main` via `.github/workflows/deploy.yml`
- Vite `base: '/alloc8/'` is set for the GitHub Pages subpath
- Workflow runs tests before building — broken code won't deploy

## PWA

- Configured via `vite-plugin-pwa` in `vite.config.ts` with `registerType: 'autoUpdate'`
- `devOptions.enabled: true` makes the manifest and service worker available in dev mode
- Web app manifest, service worker, and workbox files are auto-generated at build time in `dist/`
- PWA icons in `public/`: `icon.svg` (source), `pwa-192x192.png`, `pwa-512x512.png` (generated via sharp-cli)
