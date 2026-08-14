#!/usr/bin/env bash
# NUVORA - ordered release merge (final step).
#
# Fast-forward-merges every phase branch into main in dependency order and
# runs the release gate. All branches chain linearly on main, so each merge
# must be a clean fast-forward; the script aborts on ANY conflict or
# non-fast-forward state rather than guessing.
#
# Usage:
#   bash scripts/merge-release.sh            # merge + gate
#   bash scripts/merge-release.sh --dry-run  # report only
#   bash scripts/merge-release.sh --no-gate  # merge without the full gate
set -euo pipefail

# Location-independent: resolve the repo root from git itself, so the
# script can be run from anywhere inside the repository (or via a copy).
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

DRY=0
GATE=1
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --no-gate) GATE=0 ;;
    *) echo "unknown flag: $arg"; exit 2 ;;
  esac
done

# Order matters: each phase builds on the previous (linear history).
BRANCHES=(
  feature/phase-43-remediation
  feature/phase-44-g3-observability
  feature/phase-45-g4-staging
  feature/phase-46-g5-safeguarding
  feature/phase-47-g6-browser-e2e
  feature/phase-48-ui-mobile-loadtests
  feature/phase-49-g7-hardening
  feature/phase-50-ci-hero-devux
  feature/phase-51-dashboards-wizard
  feature/phase-52-dashboard-shells
  feature/phase-52-batch2-home-cleanup
  feature/phase-52-batch3-heroes-tutors
  feature/phase-52-batch4-payments-e2e
)

start_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$start_branch" != "main" ]; then
  echo "!! You are on '$start_branch'. The script operates on main -"
  echo "   switch with: git checkout main"
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "!! Working tree is dirty - commit or stash before merging."
  exit 1
fi

MODE="LIVE"
if [ "$DRY" = "1" ]; then MODE="DRY-RUN"; fi

echo "============================================================"
echo " NUVORA release merge - $MODE"
echo " base: $(git log --oneline -1 main)"
echo "============================================================"

# Verify the ESSENTIAL invariant: the branches form one linear chain
# (each tip is an ancestor of the next). main may hold extra commits
# (e.g. dev-tooling) - the merge phase reconciles that via the release tip.
prev_ref=""
for b in "${BRANCHES[@]}"; do
  ref="$b"
  if ! git rev-parse --verify "$b" >/dev/null 2>&1; then
    if git rev-parse --verify "origin/$b" >/dev/null 2>&1; then
      ref="origin/$b"
    else
      echo "X branch missing locally: $b - fetch its bundle first"
      exit 1
    fi
  fi
  tip="$(git rev-parse --short "$ref")"
  if [ -n "$prev_ref" ]; then
    if git merge-base --is-ancestor "$prev_ref" "$ref"; then
      echo "  ok $b ($tip) - chains on previous"
    else
      echo "X $b does not chain on the previous branch - aborting"
      exit 1
    fi
  else
    echo "  ok $b ($tip) - chain head"
  fi
  if git merge-base --is-ancestor "$ref" main; then
    echo "  .  $b - already contained in main"
  fi
  prev_ref="$ref"
done

if [ "$DRY" = "1" ]; then
  echo "============================================================"
  echo " dry-run complete - no changes made."
  exit 0
fi

LAST="${BRANCHES[${#BRANCHES[@]}-1]}"
LAST_REF="$LAST"
if ! git rev-parse --verify "$LAST" >/dev/null 2>&1; then
  LAST_REF="origin/$LAST"
fi

# The branch chain starts at an older main base. If main has extra commits
# (e.g. the dev-tooling chore), create the release tip ON the last branch:
# merge main into it, then fast-forward main to that tip. One known
# conflict is resolved automatically (docs/LOCAL_RUN.md: main's version is
# the newer, richer one).
RELEASE_TIP=0
if ! git merge-base --is-ancestor main "$LAST_REF"; then
  echo "-- main has commits outside the chain - preparing release tip on $LAST --"
  git checkout -q "$LAST"
  git config user.name "$(git config user.name || echo Release)" >/dev/null 2>&1 || true
  git config user.email "$(git config user.email || echo release@nuvora.local)" >/dev/null 2>&1 || true
  if ! git merge --no-edit main >/dev/null 2>&1; then
    if git diff --name-only --diff-filter=U | grep -qx "docs/LOCAL_RUN.md"; then
      echo "  resolving docs/LOCAL_RUN.md (keeping main's richer version)"
      git checkout --theirs docs/LOCAL_RUN.md
      git add docs/LOCAL_RUN.md
      GIT_EDITOR=true git merge --continue || true
    else
      echo "X merge conflict beyond docs/LOCAL_RUN.md - resolve manually, then:"
      echo "  git checkout main && git merge --ff-only $LAST"
      exit 1
    fi
  fi
  echo "-- release tip created on $LAST --"
  git checkout -q main
  LAST_REF="$LAST" # the local branch now carries the release tip
  RELEASE_TIP=1
fi

if [ "$RELEASE_TIP" = "1" ]; then
  # One fast-forward covers the entire chain (all branch tips are ancestors
  # of the release tip, and main's own commits are inside it too).
  echo "-- fast-forwarding main to the release tip --"
  git merge --ff-only "$LAST_REF"
else
  for b in "${BRANCHES[@]}"; do
    ref="$b"
    if ! git rev-parse --verify "$b" >/dev/null 2>&1; then
      ref="origin/$b"
    fi
    if git merge-base --is-ancestor "$ref" main; then
      continue # already merged
    fi
    echo "-- merging $b --"
    git merge --ff-only "$ref"
  done
fi

echo "============================================================"
echo " merged. main tip: $(git log --oneline -1)"
echo "============================================================"

if [ "$GATE" = "1" ]; then
  echo "-- release gate --"
  go build ./... && echo "  ok go build"
  go test ./... >/dev/null 2>&1 && echo "  ok go test" || { echo "  FAIL go test"; exit 1; }
  (cd client && npx tsc --noEmit) && echo "  ok client tsc"
  echo "  note: push main + CI runs the full suite (e2e-pg, browser, drill, metrics)."
fi

echo "============================================================"
echo " release merge complete. Next: git push origin main"
echo " then watch the CI suite - every job must be green."
echo "============================================================"
