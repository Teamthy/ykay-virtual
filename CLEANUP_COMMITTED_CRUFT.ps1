<#
.SYNOPSIS
  Removes the 40 files that commit 0b0ff456 accidentally pushed to main.

.DESCRIPTION
  That commit swept in two groups of files that do not belong in the repo:

    1. .apply-backup-20260907-235745\  (10 files)
       Backups created by an earlier version of APPLY_EDUPORT_AUDIT_FIXES.ps1,
       which wrote them INSIDE the repo. `git add -A` then committed them.
       The applier script is fixed and now writes backups under $env:TEMP.

    2. ykay-eduport-*.bundle  (30 files)
       Git bundles from earlier transfer sessions. These pre-date this audit -
       they were already untracked in your working tree - but `git add -A`
       picked them up too.

  This script UNTRACKS both groups and adds .gitignore rules. It does NOT
  delete the .bundle files from disk, since they may be your only copy of the
  transfers they contain. The .apply-backup folder is redundant (its contents
  are the pre-apply state of files that are safely in git history) so it is
  offered for deletion behind -DeleteBackups.

  Nothing is pushed. Review, commit, then push.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\CLEANUP_COMMITTED_CRUFT.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File .\CLEANUP_COMMITTED_CRUFT.ps1 -DeleteBackups
#>
[CmdletBinding()]
param(
  [switch]$DeleteBackups
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Get-Location).Path

Write-Host "==> Untracking accidentally committed files" -ForegroundColor Cyan
Write-Host "    Repo root: $RepoRoot"

if (-not (Test-Path (Join-Path $RepoRoot '.git'))) {
  Write-Host "    !! Not a git repository. Run this from the repo root." -ForegroundColor Red
  exit 1
}

# ── 1. Find what is actually tracked ──────────────────────────────────────
$TrackedBackups = @(git ls-files -- '.apply-backup-*')
$TrackedBundles = @(git ls-files -- '*.bundle')

Write-Host ""
Write-Host ("    tracked backup files : " + $TrackedBackups.Count)
Write-Host ("    tracked .bundle files: " + $TrackedBundles.Count)

if ($TrackedBackups.Count -eq 0 -and $TrackedBundles.Count -eq 0) {
  Write-Host ""
  Write-Host "    Nothing tracked to remove. Already clean?" -ForegroundColor Green
  exit 0
}

# ── 2. Untrack, keeping the files on disk ─────────────────────────────────
# --cached removes from the index only. Deleting the bundles from disk would
# destroy transfers that may not exist anywhere else.
Write-Host ""
Write-Host "    Untracking (files stay on disk)..."
if ($TrackedBackups.Count -gt 0) {
  git rm -r --cached --quiet -- '.apply-backup-*'
  Write-Host ("      removed " + $TrackedBackups.Count + " backup files from the index")
}
if ($TrackedBundles.Count -gt 0) {
  git rm --cached --quiet -- '*.bundle'
  Write-Host ("      removed " + $TrackedBundles.Count + " .bundle files from the index")
}

# ── 3. .gitignore rules so this cannot recur ──────────────────────────────
$IgnorePath = Join-Path $RepoRoot '.gitignore'
$Existing = ''
if (Test-Path $IgnorePath) { $Existing = Get-Content -Raw $IgnorePath }

$Rules = @(
  '# Applier-script backups (never commit these)',
  '.apply-backup-*/',
  'apply-backup-*/',
  '',
  '# Git bundles used to transfer work between machines',
  '*.bundle'
)

$Added = @()
foreach ($rule in $Rules) {
  if ($rule -eq '') { $Added += ''; continue }
  if ($Existing -notmatch [regex]::Escape($rule)) { $Added += $rule }
}

if ($Added.Count -gt 0) {
  $Block = "`n# --- added by CLEANUP_COMMITTED_CRUFT.ps1 ---`n" + ($Added -join "`n") + "`n"
  Add-Content -Path $IgnorePath -Value $Block -NoNewline
  # Stage it: the untracking above is already staged, and committing without
  # this would split the fix across two commits.
  git add -- .gitignore
  Write-Host ""
  Write-Host "    added to .gitignore (staged):" -ForegroundColor Green
  $Added | Where-Object { $_ } | ForEach-Object { Write-Host ("      " + $_) }
} else {
  Write-Host ""
  Write-Host "    .gitignore already covers these patterns"
}

# ── 4. Optionally delete the redundant backup folder ──────────────────────
if ($DeleteBackups) {
  Get-ChildItem -Path $RepoRoot -Directory -Filter '.apply-backup-*' | ForEach-Object {
    Write-Host ("    deleting " + $_.Name)
    Remove-Item -LiteralPath $_.FullName -Recurse -Force
  }
} else {
  $Left = @(Get-ChildItem -Path $RepoRoot -Directory -Filter '.apply-backup-*')
  if ($Left.Count -gt 0) {
    Write-Host ""
    Write-Host ("    Left " + $Left.Count + " .apply-backup-* folder(s) on disk (now ignored).") -ForegroundColor Yellow
    Write-Host "    They duplicate content already in git history; re-run with -DeleteBackups to remove."
  }
}

# ── 5. Report ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==> git status" -ForegroundColor Cyan
git status -sb

Write-Host ""
Write-Host "NEXT:" -ForegroundColor Green
Write-Host "  git diff --cached --stat        # sanity-check what will be committed"
Write-Host '  git commit -m "chore: untrack applier backups and transfer bundles"'
Write-Host "  git push origin main"
Write-Host ""
Write-Host "NOTE: the files stay in git history at 0b0ff456 (~772 KB of pack data)."
Write-Host "That is not worth a history rewrite for a repo this size. If you ever do"
Write-Host "want them gone, 'git filter-repo' is the tool - but it rewrites every"
Write-Host "commit SHA and forces everyone to re-clone."
