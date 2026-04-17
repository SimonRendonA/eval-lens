#!/usr/bin/env bash
# Stop hook: run the Vitest suite when Claude declares a task done.
#
# Emits a terse summary to stdout (which Claude Code surfaces in the session
# transcript). Does not abort — the session has already ended at this point.
# The purpose is to make test failures impossible to miss, not to prevent
# them.

set -uo pipefail

# Only run if we're in the EvalLens repo (has package.json with a test:run
# script).
if [ ! -f "package.json" ] || ! grep -q '"test:run"' package.json 2>/dev/null; then
  exit 0
fi

# Run tests in CI mode (non-interactive, exits on completion).
# Capture output to a temp file so we can extract a summary.
tmp_out="$(mktemp -t evallens-test-on-stop.XXXXXX)"
trap 'rm -f "$tmp_out"' EXIT

if npm run test:run --silent >"$tmp_out" 2>&1; then
  # Tests passed. Emit a one-liner summary.
  # Extract the "Test Files" and "Tests" lines Vitest prints at the end.
  summary="$(grep -E "^[[:space:]]*(Test Files|Tests)[[:space:]]" "$tmp_out" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')"
  echo "[test-on-stop] PASS  ${summary:-vitest run completed}"
else
  exit_code=$?
  echo "[test-on-stop] FAIL  vitest exited $exit_code"
  echo "--- tail of test output ---"
  tail -n 40 "$tmp_out"
  echo "--- end test output ---"
fi

exit 0