<#
apply-nuvora-fixes.ps1 — one-shot apply of BOTH audit-remediation batches.

Assumes the two bundles are available next to this script:
    nuvora-batch1.zip
    nuvora-batch2.zip

What it does:
  1. Extracts each zip into the repo root (creates _audit-batch1/ and _audit-batch2/).
  2. Runs each batch's drift-guarded apply script (verify + commit on its branch).
  3. Runs the migration for batch 2 (000033) via go run ./cmd/migrate --cmd=up.

USAGE — the correct way is to RUN THIS AS A .ps1 FILE from the repo root:
    .\apply-nuvora-fixes.ps1                      # apply both + commit on branches
    .\apply-nuvora-fixes.ps1 -Push                # + push both branches to origin
    .\apply-nuvora-fixes.ps1 -SkipMigration       # skip the DB migration step
    .\apply-nuvora-fixes.ps1 -SkipVerification    # skip go build/test

IMPORTANT: do NOT paste the script body into the console line-by-line. Save it
as a file and run it. When pasted interactively, $PSScriptRoot is empty, and
many functions (the batch scripts, migration) must run as files anyway.
#>
[CmdletBinding()]
param(
  [switch]$Push,
  [switch]$SkipMigration,
  [switch]$SkipVerification
)
$ErrorActionPreference = "Stop"

# $PSScriptRoot is only set when this runs as a script FILE. Fall back to the
# current directory when pasted interactively, but prefer running as a file.
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

# Locate repo root (directory containing .git) from $scriptDir.
$repoRoot = $scriptDir
while ($repoRoot -and -not (Test-Path (Join-Path $repoRoot ".git"))) {
  $parent = Split-Path $repoRoot -Parent
  if ($parent -eq $repoRoot) { throw "Could not locate a git repo root from '$scriptDir'." }
  $repoRoot = $parent
}
if (-not $repoRoot -or -not (Test-Path (Join-Path $repoRoot ".git"))) {
  throw "This script must run from inside the ykay-virtual repository."
}
Write-Host "Repo root : $repoRoot"

# The zips live next to this script.
$z1 = Join-Path $scriptDir "nuvora-batch1.zip"
$z2 = Join-Path $scriptDir "nuvora-batch2.zip"
foreach ($z in @($z1, $z2)) {
  if (-not (Test-Path $z)) { throw "Missing bundle: $z" }
}

Set-Location $repoRoot

# 1. Extract both zips (idempotent: Expand-Archive overwrites cleanly).
foreach ($z in @($z1, $z2)) {
  Write-Host "==> Extracting $z"
  Expand-Archive -Path $z -DestinationPath $repoRoot -Force
}

# 2. Apply each batch as a SCRIPT FILE (so $PSScriptRoot resolves correctly).
$apply1 = Join-Path $repoRoot "_audit-batch1\apply-batch1.ps1"
$apply2 = Join-Path $repoRoot "_audit-batch2\apply-batch2.ps1"
foreach ($a in @($apply1, $apply2)) {
  if (-not (Test-Path $a)) { throw "Apply script not found: $a" }
  Write-Host "`n========== Running: $a =========="
  $applyArgs = @()
  if ($Push)             { $applyArgs += "-Push" }
  if ($SkipVerification) { $applyArgs += "-SkipVerification" }
  & $a @applyArgs
  if ($LASTEXITCODE -ne 0) { throw "Apply failed: $a" }
}

# 3. Migration 000033 (batch 2 index) — requires a reachable DATABASE_URL.
if (-not $SkipMigration) {
  Write-Host "`n==> Applying migration 000033 (user_roles(role_id) index)"
  Write-Warning "This needs Postgres running and DATABASE_URL set."
  Write-Warning "If it fails, start Docker Postgres (docker compose up -d postgres) or re-run with -SkipMigration."
  & go run ./cmd/migrate --cmd=up
  if ($LASTEXITCODE -ne 0) { throw "Migration failed. Re-run with -SkipMigration after fixing the DB." }
} else {
  Write-Host "`n(Skipped migration. Run later: go run ./cmd/migrate --cmd=up)"
}

Write-Host "`n============================================================"
Write-Host " Done. Two branches created:"
Write-Host "   feature/phase-53-batch1-security-hardening"
Write-Host "   feature/phase-53-batch2-hardening-ci"
if ($Push) { Write-Host " Both pushed to origin." }
Write-Host " Open PRs into main, then delete the _audit-batch*/ folders."
Write-Host "============================================================"
