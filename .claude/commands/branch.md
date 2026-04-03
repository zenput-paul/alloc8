Start a new feature branch from latest main:

1. Stash any uncommitted changes if present
2. Run `git checkout main && git pull`
3. Create and switch to a new branch named `$ARGUMENTS`
4. If there were stashed changes, notify the user (do not auto-pop)
5. Confirm the branch is ready
