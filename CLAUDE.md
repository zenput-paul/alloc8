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

The user provides: current value of each asset, unit prices for unit-type assets, and the total amount to invest. The app distributes the new investment across groups respecting target percentages and deviation thresholds, then determines how many units to buy (for unit-type) or how much to allocate (for fixed-type). After initial allocation, leftover from unit-type rounding is reinvested by buying additional units, prioritizing groups furthest below target.

**Constraints:**
- Group target percentages must total exactly 100%.
- Every group must have a target percentage > 0%.
- Deviation threshold must be less than the target percentage.
- Every group must have at least one active asset.
- The calculator throws if constraints are violated; the UI validates in dialogs.

## Data model

- `Portfolio { groups: Group[] }`
- `Group { id, name, targetPercentage, deviationThreshold }`
- `Asset { id, groupId, name, type: 'unit' | 'fixed', active }`
- Assets reference groups; portfolio only contains groups
- Data persisted to IndexedDB via RxDB

## Workflow

- When making code changes, always create or update related tests
- After changes, check if CLAUDE.md needs updating (new files, patterns, architecture, commands)
- Run `/check` before every commit — do not commit if checks fail
- Run `/i18n` after adding or modifying UI strings to catch missing translations
- Work one phase at a time — complete and verify before moving to the next
- Prefer explicit behavior over implicit defaults (no silent coercion, require intentional values)
- Spanish translations (`es.json`) should be reviewed by a native speaker — flag regional variations

## Commands

- `npm run dev` - Start dev server
- `npm run build` - Type-check and build for production
- `npm run preview` - Preview production build
- `npx tsc --noEmit` - Type-check only
- `npx vitest run` - Run unit/component tests
- `npx vitest run <path>` - Run specific test file
- `npx playwright test` - Run e2e tests

### Slash commands

- `/check` - Run type-check, lint, tests, and IDE diagnostics
- `/test` - Run Vitest (optionally with a file path)
- `/commit` - Run checks, then commit and push
- `/i18n` - Check translation files for missing or unused keys
- `/update-docs` - Update CLAUDE.md based on recent changes

## Architecture

- `src/main.tsx` - Entry point; sets up MUI ThemeProvider, CssBaseline, and DatabaseProvider
- `src/App.tsx` - Responsive nav shell: BottomNavigation on mobile, Tabs in AppBar on desktop; switches between Portfolio and Calculator views
- `src/components/portfolio/PortfolioView.tsx` - Portfolio view: group list, validation banner (% must total 100), CRUD
- `src/components/portfolio/GroupCard.tsx` - Expandable card for a group, lists assets with Switch toggle, three-dot menu for edit/delete
- `src/components/portfolio/GroupDialog.tsx` - Create/edit group dialog with validation and `%` InputAdornment
- `src/components/portfolio/AssetDialog.tsx` - Create/edit asset dialog with Stocks (units)/Fixed amount type switching
- `src/components/calculator/CalculatorView.tsx` - Calculator view (input form, results)
- `src/lib/calculator.ts` - Pure investment calculation function (`calculateAllocations`); no side effects, no UI dependencies
- `src/types.ts` - Core type definitions (Group, Asset, Portfolio, AssetInput, AssetAllocation)
- `src/db/index.ts` - RxDB database creation and collection type exports
- `src/db/schemas/group.ts` - Group collection schema
- `src/db/schemas/asset.ts` - Asset collection schema (uses `ref: 'groups'` for groupId)
- `src/db/DatabaseProvider.tsx` - Initializes RxDB and provides it via rxdb-hooks `Provider`
- MUI's `createTheme()` in main.tsx controls the global theme (primary: `#2E7D32` dark green)
- Styling is done via MUI's `sx` prop and component props (no separate CSS files)
- Dialogs use a key pattern: outer Dialog + inner form component that remounts via key on close
- Dialog forms are wrapped in `<form>` with `onSubmit` for Enter key support
- Destructive actions (delete group/asset) use a confirmation dialog
- Use `useRxCollection` and `useRxQuery` from `rxdb-hooks` to read data in components
- Use type-only imports (`import type`) for types — `verbatimModuleSyntax` is enabled

## Testing

- **Vitest** + **jsdom** for unit/component tests (`vitest.config.ts`)
- **React Testing Library** for component rendering and interaction
- **Playwright** for e2e tests (`playwright.config.ts`, `e2e/` directory)
- Test setup file: `src/test-setup.ts` (imports jest-dom matchers)

## Internationalization (i18n)

- `react-i18next` + `i18next` with `i18next-browser-languagedetector`
- `src/i18n/index.ts` — i18n config, auto-detects browser language, falls back to English
- `src/i18n/en.json` — English translations
- `src/i18n/es.json` — Spanish translations
- All UI strings use `t('key')` from `useTranslation()` — no hardcoded strings in components
- Language switcher in the app bar (globe icon)
- i18next pluralization via `_one` / `_other` suffixes (e.g. `assetCount`)
- Imported in `src/main.tsx` (side-effect import) and `src/test-setup.ts` for tests

## PWA

- Configured via `vite-plugin-pwa` in `vite.config.ts` with `registerType: 'autoUpdate'`
- `devOptions.enabled: true` makes the manifest and service worker available in dev mode
- Web app manifest, service worker, and workbox files are auto-generated at build time in `dist/`
- PWA icons in `public/`: `icon.svg` (source), `pwa-192x192.png`, `pwa-512x512.png` (generated via sharp-cli)
