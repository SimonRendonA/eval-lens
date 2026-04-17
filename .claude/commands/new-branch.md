Create a new feature branch from a fresh `main`, following the repo's branch
naming convention.

User input: $ARGUMENTS

## What `$ARGUMENTS` should look like

A short natural-language description of the work, optionally prefixed with a
type keyword:

- `fix login race condition` → `fix/login-race-condition`
- `feat add csv export for failed rows` → `feat/add-csv-export-for-failed-rows`
- `docs clarify self-hosted mode in readme` → `docs/clarify-self-hosted-mode-in-readme`
- `add schema inference for nested objects` (no type given — ask the user)

## Steps

### 1. Validate preconditions

- Run `git status --porcelain`. If there is any output, stop and tell the
  user to commit or stash their changes first. Do not create the branch with
  uncommitted work floating around.
- Run `git rev-parse --is-inside-work-tree` to confirm we are in a git repo.
  If not, stop.

### 2. Parse input

If `$ARGUMENTS` is empty, ask: *"What is the change? (e.g. 'fix login race
condition' or 'feat add csv export')"* and stop until the user responds.

Identify a type prefix from the first word if it matches one of:
`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`,
`build`, `revert`.

If no type prefix is present, ask: *"Which type best describes this change?
(feat, fix, docs, refactor, chore, test, perf, style, ci, build)"* and stop
until the user responds.

### 3. Build the branch name

- Take the description (everything after the type prefix, or the whole input
  if the user answered the type question separately).
- Lowercase.
- Replace non-alphanumeric characters with hyphens.
- Collapse consecutive hyphens.
- Trim leading and trailing hyphens.
- Truncate the description portion to at most 50 characters, trimming at a
  word boundary where possible.
- Final shape: `<type>/<description>`.

Show the proposed branch name to the user and ask for confirmation before
creating it. If they want to adjust, rebuild from their input.

### 4. Create the branch from a fresh `main`

Once confirmed:

```
git checkout main
git fetch origin main
git reset --hard origin/main
git checkout -b <branch-name>
```

Use `git reset --hard origin/main` rather than `pull` because the local `main`
should always mirror origin — the user's policy is "no direct commits to
main," so there is nothing on local `main` worth preserving. If the user has
local commits on `main`, stop and surface them before doing any reset — do
not destroy work silently.

Specifically:

- Before the reset, run `git log --oneline origin/main..main`. If there is any
  output, stop and show the user those commits. Do not reset. Ask them what
  to do.

### 5. Report

Tell the user:

- Branch created: `<branch-name>`
- Base: `origin/main` at `<short-sha>` (`<commit subject>`)
- Reminder: commits go on this branch, pushed via `git push -u origin <branch>`,
  and land on `main` only through a PR.

Stop. Do not begin any implementation work. The user prompts for that
separately.

## Do not

- Do not create a branch with uncommitted changes in the working tree.
- Do not overwrite local `main` commits without explicit user confirmation.
- Do not start implementing whatever the branch is for.
- Do not push the new branch automatically. Pushing happens when there's
  something to push.
- Do not accept branch names that don't match `<type>/<kebab>` shape.