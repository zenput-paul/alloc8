Commit and push changes:

1. Run `/update-docs` to ensure CLAUDE.md reflects recent changes
2. Run `/check` — do not proceed if any checks fail
3. Run `git status` and `git diff` to review all changes
4. Stage relevant files (avoid staging secrets or generated files)
5. Write a descriptive commit message:
   - Summarize the nature of the changes (new feature, bug fix, refactor, etc.)
   - Focus on the "why" rather than the "what"
   - End with: Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
6. Commit and push to remote
7. Report the commit hash and a summary of what was pushed
