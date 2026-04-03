Create a pull request for the current branch:

1. Run `git log main..HEAD --oneline` and `git diff main...HEAD --stat` to understand all changes
2. Push the branch to remote with `git push -u origin HEAD`
3. Generate a PR title (under 70 characters) and description with:
   - A summary section with 1-3 bullet points covering ALL commits, not just the latest
   - A test plan checklist
4. Output the title and description for the user to create the PR on GitHub
5. Provide the direct link: `https://github.com/zenput-paul/alloc8/pull/new/<branch-name>`
