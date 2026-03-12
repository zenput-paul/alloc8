# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

React + TypeScript app using Vite and MUI (Material UI). Node.js 22 (managed via asdf).

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
