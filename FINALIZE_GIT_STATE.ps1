# ============================================================================
#  NUVORA / ykay-virtual - Finalize git state after applying the migration
#  safety gate. Run from the repo root.
#
#  WHAT IT DOES (safe - does NOT commit or push):
#    1. Verifies no git conflict markers remain in any migrations/*.sql
#    2. Marks the leftover 'unmerged' 000044_remove_ielts_toefl_pte files as
#       resolved (git add), so the 000044 / 000045 pair is clean
#    3. Shows the resulting staged status for you to review
#
#  Run:
#      powershell -NoProfile -ExecutionPolicy Bypass -File .\FINALIZE_GIT_STATE.ps1
# ============================================================================
$ErrorActionPreference = "Stop"

$RepoRoot = Get-Location
while (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    $parent = Split-Path $RepoRoot -Parent
    if ($null -eq $parent -or $parent -eq $RepoRoot) { break }
    $RepoRoot = $parent
}
if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
    Write-Host "ERROR: could not find the repo root (.git)." -ForegroundColor Red
    exit 1
}
Set-Location $RepoRoot
Write-Host "==> Repo root: $RepoRoot"

# --- 1. Safety: no conflict markers in any migration SQL -------------------
Write-Host "==> [1/3] Checking migrations/*.sql for conflict markers..."
$bad = @()
Get-ChildItem (Join-Path $RepoRoot "migrations") -Filter *.sql | ForEach-Object {
    $content = Get-Content -Raw -ErrorAction SilentlyContinue $_.FullName
    if ($content -match '<<<<<<<|>>>>>>>|^=======$') {
        $script:bad += $_.Name
    }
}
if ($bad.Count -gt 0) {
    Write-Host ("FAIL: conflict markers found in: " + ($bad -join ", ")) -ForegroundColor Red
    Write-Host "Resolve those markers by hand before continuing." -ForegroundColor Yellow
    exit 1
}
Write-Host "  OK - no conflict markers."

# --- 2. Resolve the leftover unmerged 000044 files -------------------------
Write-Host "==> [2/3] Marking 000044/000045 migration files as resolved..."
git add "migrations/000044_remove_ielts_toefl_pte.up.sql" "migrations/000044_remove_ielts_toefl_pte.down.sql"
git add -A

# --- 3. Show final status ---------------------------------------------------
Write-Host "==> [3/3] Resulting status:"
git status --short

Write-Host ""
Write-Host "Next steps (review first, then):" -ForegroundColor Cyan
Write-Host "  git commit -m 'ci(migrations): add duplicate/marker safety gate + resolve 000044 conflict'"
Write-Host "  git push origin main"
