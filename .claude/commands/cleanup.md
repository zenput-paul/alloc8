Find dead code and unused declarations:

1. Run `/i18n` to check for unused or missing translation keys
2. Search `src/types.ts` for every exported interface/type, then grep the codebase (excluding `types.ts` itself) to find any that are never imported — report unused types
3. Search all `.ts` and `.tsx` files in `src/` for exported functions and components, then check if each export is imported somewhere else — report any unused exports
4. Report a summary of all dead code found. If everything is clean, confirm no dead code detected.
