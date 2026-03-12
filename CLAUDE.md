# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

React + TypeScript PWA using Vite, MUI (Material UI), and vite-plugin-pwa. Node.js 22 (managed via asdf).

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
