#!/usr/bin/env bash
#
# Migration safety gate — prevents the two deploy-breaking failures this
# project has already hit in production:
#
#   1. Duplicate version numbers  — two files numbered 0000xx. The runner
#      silently lets one win, so the other never runs and the DB drifts.
#   2. Conflict markers            — `<<<<<<<`/`=======`/`>>>>>>>` injected
#      by a botched `git apply --3way`; such SQL is invalid or runs the
#      wrong thing.
#
# A phantom-table error (a migration referencing a table that doesn't exist)
# cannot be caught statically, so this script ALSO migrates the full chain
# against a real PostgreSQL and fails if any statement errors.
#
# Usage:
#   bash scripts/check-migrations.sh            # static checks only
#   DATABASE_URL=postgres://... bash scripts/check-migrations.sh   # + live migrate
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> [1/4] Static gate: duplicate versions + conflict markers"
go test ./migrations/ -run 'TestChainStatic' -count=1

echo "==> [2/4] Conflict-marker scan across all migration/seed SQL"
VIOLATIONS=0
while IFS= read -r -d '' f; do
  if grep -Eq '^(<<<<<<<|>>>>>>>)|\n=======\n' "$f"; then
    echo "  FAIL: $f contains git conflict markers" >&2
    VIOLATIONS=1
  fi
done < <(find migrations scripts -name '*.sql' -type f -print0)
if [ "$VIOLATIONS" -ne 0 ]; then
  echo "==> migration safety check FAILED" >&2
  exit 1
fi

echo "==> [3/4] Duplicate version scan (migrations dir)"
DUPS="$(find migrations -name '*.sql' -type f \
  | sed -E 's#.*/([0-9]+)_[^/]*$#\1#' \
  | sort | uniq -c | awk '$1 > 2 {print $2}')"
if [ -n "$DUPS" ]; then
  echo "  FAIL: versions with more than one .up AND one .down file: $DUPS" >&2
  echo "==> migration safety check FAILED" >&2
  exit 1
fi

# Live migration check (only when a DATABASE_URL is provided, e.g. in CI).
if [ -n "${DATABASE_URL:-}" ]; then
  echo "==> [4/4] Live migrate of full chain against PostgreSQL"
  go run ./cmd/migrate --cmd=up --dir=migrations
  # Every version that has an .up.sql must now be recorded as applied.
  TOTAL="$(find migrations -name '*.up.sql' -type f \
    | sed -E 's#.*/([0-9]+)_[^/]*$#\1#' | sort -u | wc -l)"
  APPLIED="$(psql "$DATABASE_URL" -Atc 'SELECT COUNT(*) FROM schema_migrations')"
  echo "  applied=$APPLIED expected=$TOTAL"
  if [ "$APPLIED" -ne "$TOTAL" ]; then
    echo "  FAIL: schema_migrations count != number of .up.sql files" >&2
    exit 1
  fi
else
  echo "==> [4/4] Skipped live migrate (set DATABASE_URL to enable)"
fi

echo "==> migration safety check OK"
