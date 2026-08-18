# APPLY_NUVORA_FIXES.ps1
# Applies nuvora-fixes.patch (mojibake + build fix + role-separated LMS + compact cohort grid + super admin page)
# Run from the repo root, e.g.:
#   cd C:\Users\USER\Desktop\PROJECTS\ykay-virtual
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\APPLY_NUVORA_FIXES.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

if (-not (Test-Path ".\nuvora-fixes.patch")) {
    Write-Host "ERROR: nuvora-fixes.patch not found in current folder." -ForegroundColor Red
    exit 1
}

Write-Host "==> Applying nuvora-fixes.patch..." -ForegroundColor Cyan

# Dry-run first to surface any problem (CRLF/whitespace conflicts) before touching files.
git apply --check --ignore-space-change --ignore-whitespace .\nuvora-fixes.patch
if ($LASTEXITCODE -ne 0) {
    Write-Host "check failed; trying --3way fallback..." -ForegroundColor Yellow
    git apply --3way --ignore-space-change --ignore-whitespace .\nuvora-fixes.patch
} else {
    git apply --ignore-space-change --ignore-whitespace .\nuvora-fixes.patch
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: patch did not apply cleanly." -ForegroundColor Red
    Write-Host "This usually means your working tree differs from the base commit (3c5471e)." -ForegroundColor Red
    Write-Host "Run:  git status  and  git stash  then retry, or commit/discard local edits first." -ForegroundColor Red
    exit 1
}

Write-Host "==> Patch applied OK. Verifying..." -ForegroundColor Green
git status --short

Write-Host ""
Write-Host "==> Staging everything and committing..." -ForegroundColor Cyan
git add -A
git commit -m "fix: mojibake (NGN/dashes), slog build, split tutor/student LMS, compact cohort grid, super admin page"

Write-Host ""
Write-Host "Done. Review with:  git show --stat HEAD" -ForegroundColor Green
Write-Host "Push with:         git push" -ForegroundColor Green
