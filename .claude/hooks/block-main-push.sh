#!/usr/bin/env bash
# PreToolUse hook on Bash: block `git push` if the current branch is `main`.
#
# EvalLens policy: all changes land on main only via PR. This hook enforces
# that at the tool level so prompting is not the only line of defense.
#
# Exit codes:
#   0 → allow the command
#   2 → block the command (stderr is shown to Claude)

set -uo pipefail

payload="$(cat)"

# Extract the bash command from the tool input.
if command -v jq >/dev/null 2>&1; then
  cmd="$(echo "$payload" | jq -r '.tool_input.command // empty')"
else
  # Crude fallback. The Bash tool stores the command under tool_input.command.
  cmd="$(echo "$payload" | grep -o '"command"[^,}]*' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')"
fi

# Nothing to inspect → allow.
if [ -z "$cmd" ]; then
  exit 0
fi

# Only intercept commands that are actually `git push`. Match permissively
# (handles `git push`, `git  push`, `git push --force`, chained with &&, etc.)
# but not things that merely contain the string "git push" inside quotes.
if ! echo "$cmd" | grep -qE '(^|[[:space:];&|]+)git[[:space:]]+push([[:space:];&|]|$)'; then
  exit 0
fi

# We're looking at a `git push`. What branch are we on?
# Run git separately rather than trusting the command string.
current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"

if [ "$current_branch" = "main" ]; then
  echo "BLOCKED: `git push` from `main` is not allowed in this repo." >&2
  echo "EvalLens policy: all changes land on `main` via PR only." >&2
  echo "To proceed: create a feature branch with /new-branch, move your commits, and push that branch instead." >&2
  exit 2
fi

# Any other branch is fine.
exit 0