Cut a new release of EvalLens.

User input (optional bump level): $ARGUMENTS

Accepted values for $ARGUMENTS: `patch`, `minor`, `major`, or empty.
If empty, you will recommend a bump level based on commits since the last
release and confirm with the user.

## Preconditions — check all before proceeding. Stop on any failure.

1. **Working tree is clean.** Run `git status --porcelain`. If there is any
   output, stop and tell the user to commit or stash first.
2. **Current branch is not `main`.** Run `git rev-parse --abbrev-ref HEAD`.
   If it is `main`, stop and tell the user to create a release branch first
   (the `/new-branch` command does this correctly).
3. **Local `main` is up to date with origin.** Run
   `git fetch origin main && git rev-list --left-right --count HEAD...origin/main`.
   If the right side is > 0, stop — the user needs to rebase their current
   branch on the latest main first.
4. **Read the current version.** From `package.json`'s `version` field.
5. **Read current CHANGELOG.** Find the most recent version entry.
6. **Verify version alignment.** If `package.json` version and the top
   CHANGELOG version do not match, stop and report the mismatch. Do not
   attempt to fix it automatically — this requires a human decision.

## Step 1 — Determine bump level

Read commits since the last release tag or, if no tag exists, since the most
recent `chore: release` commit on `main`. If neither exists, use all commits on
the current branch.

Classify commits by Conventional Commits type:

- `feat:` → minor bump candidate
- `fix:` → patch bump candidate
- `BREAKING CHANGE:` footer or `!` in type → major bump candidate
- `docs:`, `chore:`, `refactor:`, `style:`, `test:` → no bump on their own

### Pre-1.0 rule (CRITICAL)

Current version starts with `0.`. EvalLens is pre-1.0 — see CLAUDE.md
Versioning policy.

- Treat breaking changes as a **minor** bump, not major. Pre-1.0 minors are
  allowed to break.
- **Never bump to `1.0.0` automatically.** If the user passed `major` as
  `$ARGUMENTS` or the logical next version is `1.0.0`, stop and require the
  user to explicitly type `release major --confirm-1.0` (which you will
  interpret only as permission, still not as a requirement).

If `$ARGUMENTS` is empty, propose a bump level with a one-line rationale and
**ask the user to confirm** before proceeding. Show the new version number.

If `$ARGUMENTS` is `patch`, `minor`, or `major`, honor it but still apply the
pre-1.0 rule above.

## Step 2 — Propose the changelog entry

Draft an entry for the new version under Keep a Changelog structure. Use
only these section headers, omitting empty ones:

- `### Added` — new features (`feat:` commits, additive changes)
- `### Changed` — changes to existing functionality
- `### Deprecated` — soon-to-be-removed features
- `### Removed` — removed features (breaking)
- `### Fixed` — bug fixes (`fix:` commits)
- `### Security` — vulnerabilities fixed

Rules for entries:

- One line per change, past-tense imperative ("Added X", "Fixed Y").
- User-facing language. Not "refactored `useFoo` hook" → "Reduced re-renders
  on the results page when filtering by failure reason."
- Reference PR numbers or commit hashes only if they add clarity.
- If you cannot produce a user-meaningful summary for a commit, flag it and
  ask the user whether to include it and how.
- Group related commits into a single bullet where natural.

Show the proposed changelog entry to the user and **ask for confirmation or
edits** before writing to the file.

## Step 3 — Apply the changes

Once the user confirms bump level and changelog entry:

1. Create release branch: `git checkout -b release/v<new-version>` — from the
   current branch if it is already a release branch, or from a fresh branch
   off `main` if not. Ask the user which base they want if ambiguous.
2. Update `package.json`'s `version` field to the new version. Do not touch
   any other field.
3. Insert the new changelog entry at the top of `CHANGELOG.md`, immediately
   below the "Versions follow Semantic Versioning" line and above the
   previous most recent entry. Date is today's date in `YYYY-MM-DD`.
4. Commit with message: `chore(release): v<new-version>`. No body unless the
   user asks.

## Step 4 — Push and open PR

1. Push the branch: `git push -u origin release/v<new-version>`.
2. Open a PR using GitHub CLI if available:
```
   gh pr create \
     --base main \
     --head release/v<new-version> \
     --title "chore(release): v<new-version>" \
     --body "<PR body — see below>"
```
3. If `gh` is not available, print the URL the user should visit to open the
   PR manually, along with the PR body content they should paste.

### PR body template

```
## Release v<new-version>

**Bump level:** <patch|minor|major>
**Semver rationale (pre-1.0):** <one line on why this bump is correct>

## Changelog

<the changelog entry you wrote>

## Release checklist

- [ ] Version in `package.json` updated to `<new-version>`
- [ ] `CHANGELOG.md` entry added under `[<new-version>]`
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run test:run` passes
- [ ] Docker build succeeds: `docker build -t evallens .`
- [ ] Manual smoke: hosted mode loads
- [ ] Manual smoke: self-hosted mode loads (if provider keys available)

## After merge

- [ ] Tag the merge commit: `git tag v<new-version> && git push origin v<new-version>`
- [ ] Verify deploy succeeded on Vercel
```

## Step 5 — Report to the user

Summarize what was done:

- New version
- Branch created and pushed
- PR URL (or instructions if `gh` unavailable)
- What the user still needs to do before merging (lint, typecheck, tests,
  manual smoke)
- What happens after merge (tag, deploy)

## Do not

- Do not merge the PR.
- Do not create git tags before merge.
- Do not push to `main` directly.
- Do not modify `CHANGELOG.md` entries older than the one being added.
- Do not skip confirmation prompts even if the user sounds impatient. This is
  the release pipeline — wrong bumps are painful to undo.
- Do not run lint, typecheck, or tests. That is the user's responsibility per
  the working agreements. If they haven't, they will fail the PR checklist —
  that is the correct outcome.
- Do not refactor anything during a release. Release commits contain only
  version bumps and changelog entries.