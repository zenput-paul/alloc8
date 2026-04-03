# Alloc8

Investment portfolio management PWA that helps users define a portfolio and calculate how to distribute new investments across asset groups.

## Features

- **Portfolio management** — Create groups with target percentages and deviation thresholds, add unit-type (stocks) or fixed-type (bonds) assets, activate/deactivate assets
- **Investment calculator** — Enter current values and an amount to invest; the app allocates across groups respecting targets, calculates units to buy, and distributes remainders
- **Responsive layout** — Two-column calculator on desktop, single-column on mobile with bottom navigation
- **Internationalization** — English and Spanish (Mexico), with browser language auto-detection
- **Offline-capable PWA** — All data stored locally in IndexedDB via RxDB

## Tech stack

- **React + TypeScript** with Vite
- **MUI (Material UI)** for components and theming
- **RxDB** with Dexie storage for local persistence
- **react-i18next** for internationalization
- **vite-plugin-pwa** for service worker and installability
- **Prettier** for code formatting
- **GitHub Actions** for CI/CD to GitHub Pages

## Getting started

```bash
# Install Node.js 22 via asdf (recommended)
asdf install nodejs

npm install
npm run dev
```

## Commands

| Command                  | Description                         |
| ------------------------ | ----------------------------------- |
| `npm run dev`            | Start dev server                    |
| `npm run build`          | Type-check and build for production |
| `npm run preview`        | Preview production build            |
| `npx tsc --noEmit`       | Type-check only                     |
| `npx vitest run`         | Run unit/component tests            |
| `npx playwright test`    | Run e2e tests                       |
| `npx prettier --check .` | Check code formatting               |
| `npx prettier --write .` | Format all files                    |

## Testing

- **Vitest** + React Testing Library for unit and component tests
- **Playwright** for end-to-end tests covering portfolio CRUD, calculator flows, responsive layout, and i18n

## Deployment

Automatically deployed to [GitHub Pages](https://zenput-paul.github.io/alloc8/) on push to `main` via GitHub Actions. The workflow runs tests before building — broken code won't deploy.

---

Built in collaboration with [Claude Code](https://claude.ai/code).
