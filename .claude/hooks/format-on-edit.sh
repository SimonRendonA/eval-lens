#!/usr/bin/env bash
# PostToolUse hook: run ESLint --fix on files just edited by Claude.
#
# EvalLens uses plain `eslint` (not `next lint`) per its package.json.
# Reads hook payload from stdin. Always exits 0 — lint issues should never
# block Claude's workflow, just get quietly fixed where possible.

set -uo pipefail

payload="$(cat)"

# Extract the file path. jq preferred; grep fallback.
if command -v jq >/dev/null 2>&1; then
  file_path="$(echo "$payload" | jq -r '.tool_input.file_path // empty')"
else
  file_path="$(echo "$payload" | grep -o '"file_path"[^,}]*' | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')"
fi

# No path, nothing to do.
if [ -z "$file_path" ]; then
  exit 0
fi

# Only lint files ESLint cares about.
case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    ;;
  *)
    exit 0
    ;;
esac

# Defensive: only run if we're actually in the EvalLens repo.
# Checks for package.json and that it mentions eslint.
if [ ! -f "package.json" ] || ! grep -q '"eslint"' package.json 2>/dev/null; then
  exit 0
fi

# Run eslint --fix on the single file. Silent on success.
# --no-install prevents npx from trying to fetch eslint if absent; we want it
# to fail quietly rather than surprise-install.
npx --no-install eslint --fix "$file_path" >/dev/null 2>&1 || true

exit 0