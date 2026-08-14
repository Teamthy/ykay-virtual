#!/usr/bin/env bash
# Applies the current G0 fixture-hardening changes to your local clone,
# runs available verification, creates a feature branch and pushes it.
#
# Usage:
#   bash scripts/apply-g0-fixture-hardening.sh
#   SKIP_TESTS=1 bash scripts/apply-g0-fixture-hardening.sh
#   BRANCH=feature/g0-fixture-hardening bash scripts/apply-g0-fixture-hardening.sh
#
# Prerequisite: the G0 changes must already exist in this working tree.
# This script NEVER force-pushes and does not push directly to main.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BRANCH="${BRANCH:-feature/g0-fixture-hardening}"
COMMIT_MESSAGE="security(g0): make development fixtures explicit and reject them in production"
FILES=(
  Makefile
  README.md
  api/openapi.yaml
  cmd/api/main.go
  client/app/auth/google/callback/route.ts
  client/features/auth/api.ts
  client/middleware.ts
  commit-and-push.ps1
  git-commit-push.ps1
  docs/SEEDS.md
  docs/REPOSITORY_AUDIT_2026-08-14.md
  docs/PRODUCTION_REMEDIATION_PLAN.md
  internal/config/config.go
  internal/middleware/session.go
  internal/service/auth_service.go
  internal/transport/http/auth_handler.go
  internal/config/config_test.go
  migrations/000027_retire_legacy_demo_accounts.up.sql
  migrations/000027_retire_legacy_demo_accounts.down.sql
  scripts/e2e-pg.sh
  scripts/e2e.sh
)

require_clean_index() {
  if ! git diff --cached --quiet; then
    echo "ERROR: the git index already contains staged changes. Review or unstage them first."
    exit 1
  fi
}

require_files() {
  local missing=0
  for file in "${FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
      echo "ERROR: expected file is missing: $file"
      missing=1
    fi
  done
  [[ "$missing" -eq 0 ]]
}

require_clean_index
require_files

git diff --check

if [[ "${SKIP_TESTS:-0}" != "1" ]]; then
  if command -v go >/dev/null 2>&1; then
    echo "==> Running Go format check and tests"
    test -z "$(gofmt -l internal cmd pkg)" || {
      echo "ERROR: Go files need formatting:" >&2
      gofmt -l internal cmd pkg >&2
      exit 1
    }
    go test ./...
  else
    echo "==> Go is not installed; skipping Go tests locally. CI must run them."
  fi

  if command -v npm >/dev/null 2>&1; then
    echo "==> Building Next.js web app"
    npm --prefix client ci
    npm --prefix client run build
  else
    echo "ERROR: npm is required to verify the web build. Use SKIP_TESTS=1 only if unavoidable."
    exit 1
  fi
fi

if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  git switch "$BRANCH"
else
  git switch -c "$BRANCH"
fi

git add -- "${FILES[@]}"

if git diff --cached --quiet; then
  echo "No G0 changes are staged; nothing to commit."
  exit 0
fi

echo
printf '==> About to commit these files:\n'
git diff --cached --name-status
printf '\n==> Commit message: %s\n' "$COMMIT_MESSAGE"

git commit -m "$COMMIT_MESSAGE"
git push --set-upstream origin "$BRANCH"

echo
echo "Done. Open a pull request from ${BRANCH} into main."
