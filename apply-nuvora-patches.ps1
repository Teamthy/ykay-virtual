<#
apply-nuvora-patches.ps1 — apply both audit-remediation batches via git apply
(tolerant of your local working-tree state; no byte-matching).

Place this script + the two .patch files in the repo root, then run as a FILE:

    .\apply-nuvora-patches.ps1                 # apply + commit on feature branches
    .\apply-nuvora-patches.ps1 -Push           # also push both branches to origin
    .\apply-nuvora-patches.ps1 -CheckOnly      # only verify the patches apply (no commit)

Prereq: a CLEAN working tree. If you have uncommitted changes to files the
patches touch, commit or stash them first, or run:
    git reset --hard && git clean -fd
to discard everything not committed (use only if you don't need those changes).

Note: this version uses `git show-ref --verify --quiet` for the branch check so
it never trips PowerShell's NativeCommandError on git's stderr output.
#>
[CmdletBinding()]
param(
  [switch]$Push,
  [switch]$CheckOnly
)
$ErrorActionPreference = "Stop"

$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location $root

if (-not (Test-Path (Join-Path $root ".git"))) { throw "Not a git repo: $root" }
Write-Host "Repo root : $root"
Write-Host "HEAD      : $(& git log --oneline -1)"

# Guard: require no TRACKED changes (so apply + commit are unambiguous).
# Untracked files are ignored on purpose — they may be the delivery artifacts
# themselves (the .patch, .zip, apply scripts, _audit-* folders) which should
# never be committed. `--untracked-files=no` reports only tracked modifications.
$dirty = (& git status --porcelain --untracked-files=no)
if ($dirty) {
  Write-Host ""
  Write-Warning "There are UNCOMMITTED TRACKED changes. Aborting to avoid mixing them with the patch:"
  $dirty | ForEach-Object { Write-Host "  $_" }
  if (-not $CheckOnly) {
    Write-Warning "To proceed, either commit or stash these changes first."
    throw "Aborting: tracked working-tree changes present."
  }
}

$batches = @(
  @{ Patch = "phase53-batch1.patch"; Branch = "feature/phase-53-batch1-security-hardening";
     Msg   = "security(batch1): block self-service privilege escalation, object-route file read, and distributed rate limiter" },
  @{ Patch = "phase53-batch2.patch"; Branch = "feature/phase-53-batch2-hardening-ci";
     Msg   = "ci(batch2): enforce type gate in deploy, JSON body limit, user_roles(role_id) index" }
)

foreach ($b in $batches) {
  $patch = Join-Path $root $b.Patch
  if (-not (Test-Path $patch)) { throw "Missing patch file: $patch" }

  Write-Host "`n========== $($b.Branch) =========="

  # Dry-run with 3-way: tolerates a slightly different base; no changes yet.
  git apply --check --3way $patch
  if ($LASTEXITCODE -ne 0) { throw "Patch does not apply cleanly: $($b.Patch)" }
  Write-Host "  --check OK: patch applies cleanly"

  if ($CheckOnly) { Write-Host "  (CheckOnly - not applying)"; continue }

  git apply --3way $patch
  if ($LASTEXITCODE -ne 0) { throw "git apply failed: $($b.Patch)" }
  Write-Host "  applied"

  # Branch check that does NOT emit to stderr (avoid PowerShell NativeCommandError).
  git show-ref --verify --quiet "refs/heads/$($b.Branch)"
  if ($LASTEXITCODE -eq 0) { & git checkout "$($b.Branch)" }
  else { & git checkout -b "$($b.Branch)" }
  if ($LASTEXITCODE -ne 0) { throw "git checkout failed for $($b.Branch)" }

  & git add -A
  & git commit -m $b.Msg
  if ($LASTEXITCODE -ne 0) { throw "git commit failed on $($b.Branch)" }
  Write-Host "  committed on $($b.Branch)"

  if ($Push) {
    & git push --set-upstream origin $b.Branch
    if ($LASTEXITCODE -ne 0) { throw "git push failed: $($b.Branch)" }
    Write-Host "  pushed $($b.Branch)"
  }
}

Write-Host "`nDone. Branches:"
Write-Host "  feature/phase-53-batch1-security-hardening"
Write-Host "  feature/phase-53-batch2-hardening-ci"
if ($Push) { Write-Host "  (pushed to origin)" }
Write-Host "Then run migration (Postgres must be up): go run ./cmd/migrate --cmd=up"
Write-Host "Open PRs into main when ready."
