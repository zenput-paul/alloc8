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

The user provides: current value of each asset, unit prices for unit-type assets, and the total amount to invest. The app distributes the new investment across groups respecting target percentages and deviation thresholds, then determines how many units to buy (for unit-type) or how much to allocate (for fixed-type).

## Data model

- `Portfolio { groups: Group[] }`
- `Group { id, name, targetPercentage, deviationThreshold }`
- `Asset { id, groupId, name, type: 'unit' | 'fixed', active }`
- Assets reference groups; portfolio only contains groups
- Data persisted to localStorage

## Commands

- `npm run dev` - Start dev server
- `npm run build` - Type-check and build for production
- `npm run preview` - Preview production build
- `npx tsc --noEmit` - Type-check only

## Architecture

- `src/main.tsx` - Entry point; sets up MUI ThemeProvider and CssBaseline
- `src/App.tsx` - Root application component
- MUI's `createTheme()` in main.tsx controls the global theme
- Styling is done via MUI's `sx` prop and component props (no separate CSS files)

## PWA

- Configured via `vite-plugin-pwa` in `vite.config.ts` with `registerType: 'autoUpdate'`
- `devOptions.enabled: true` makes the manifest and service worker available in dev mode
- Web app manifest, service worker, and workbox files are auto-generated at build time in `dist/`
- PWA icons are placeholder PNGs in `public/` (pwa-192x192.png, pwa-512x512.png) — replace with real assets
