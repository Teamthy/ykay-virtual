<#
NUVORA audit remediation — drift-guarded apply script.

Apply this batch from a fresh clone of ykay-virtual at the audited commit.

USAGE (extract this zip into the repo root, then):
    .\apply-batch1.ps1                 # apply + verify + commit on a feature branch
    .\apply-batch1.ps1 -Push           # also push the branch to origin
    .\apply-batch1.ps1 -SkipVerification   # skip go build/test (only if you know it's fine)

WHAT IT DOES
  1. Reads manifest.json and verifies every target file matches the exact
     'before' checksum this batch was built against. If any file differs
     (drift), it ABORTS with no changes — so it never overwrites work you
     already did.
  2. Backs up the original files into .\backup\.
  3. Copies the new file contents in and re-verifies the 'after' checksum.
  4. Runs gofmt + go build + go test on the touched Go packages (if `go`
     is on PATH).
  5. Creates a feature branch, stages only this batch's files, commits, and
     pushes only when -Push is passed. Never force-pushes.
#>
[CmdletBinding()]
param(
  [string]$Branch = "feature/phase-53-batch1-security-hardening",
  [string]$CommitMessage = "security(batch1): block self-service privilege escalation, object-route file read, and distributed rate limiter",
  [switch]$Push,
  [switch]$SkipVerification
)
$ErrorActionPreference = "Stop"

# $PSScriptRoot is only populated when this runs as a SCRIPT FILE. When the
# commands are pasted directly into an interactive console it is empty, so we
# fall back to the current working directory. Either way, this must be run from
# inside the extracted `_audit-batchN/` folder (where manifest.json + files/
# live) or from a folder above it inside the repo.
$BaseDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

$manifestPath = Join-Path $BaseDir "manifest.json"
$filesDir     = Join-Path $BaseDir "files"
$backupDir    = Join-Path $BaseDir "backup"

# --- Line-ending normalization (Windows robustness) ---------------------------
# Git repositories are stored with LF endings, but on Windows files are often
# checked out as CRLF (no .gitattributes + core.autocrlf). The manifest hashes
# are computed on LF-normalized bytes, so we normalize both the existing target
# and the incoming file before hashing/writing. This makes the drift check
# immune to CRLF/LF differences and lets us write canonical LF content that git
# treats as clean.
function Normalize-LineEndings {
  param([byte[]]$Bytes)
  $out = New-Object System.IO.MemoryStream
  $prevCR = $false
  foreach ($b in $Bytes) {
    if ($b -eq 13) { $prevCR = $true; continue }        # CR
    if ($prevCR) {
      if ($b -ne 10) { $out.WriteByte(10) }             # lone CR -> LF
      $prevCR = $false
    }
    $out.WriteByte($b)
  }
  if ($prevCR) { $out.WriteByte(10) }                    # trailing lone CR -> LF
  return $out.ToArray()
}

function Get-NormalizedHash {
  param([string]$Path)
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $norm  = Normalize-LineEndings $bytes
  $sha   = [System.Security.Cryptography.SHA256]::Create()
  $hash  = $sha.ComputeHash($norm)
  return ([BitConverter]::ToString($hash)).Replace('-', '').ToLower()
}

function Write-LfFile {
  param([string]$Path, [byte[]]$Bytes)
  $norm = Normalize-LineEndings $Bytes
  [System.IO.File]::WriteAllBytes($Path, $norm)
}

# --- Locate repo root (directory containing .git) ---------------------------
$repoRoot = $BaseDir
while ($repoRoot -and -not (Test-Path (Join-Path $repoRoot ".git"))) {
  $parent = Split-Path $repoRoot -Parent
  if ($parent -eq $repoRoot) { throw "Could not locate a git repository root under '$BaseDir'." }
  $repoRoot = $parent
}
if (-not $repoRoot -or -not (Test-Path (Join-Path $repoRoot ".git"))) { throw "Not a git repository: $BaseDir" }
Write-Host "Repo root : $repoRoot"
Set-Location $repoRoot

$current = (& git rev-parse --abbrev-ref HEAD).Trim()
$headMsg  = (& git log --oneline -1).Trim()
Write-Host "HEAD      : $headMsg"
if ($current -eq "main") {
  Write-Host "On 'main'. This script creates branch '$Branch' from the current HEAD."
} else {
  Write-Warning "Currently on '$current' (not main). Will create/use branch '$Branch' from here."
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

# --- Drift detection + backup -------------------------------------------------
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
foreach ($entry in $manifest) {
  $target = Join-Path $repoRoot $entry.path
  $src    = Join-Path $filesDir $entry.path
  if (-not (Test-Path $src)) { throw "Bundle is missing file: $($entry.path)" }

  if ($entry.new -eq $true) {
    if (Test-Path $target) {
      $existing = Get-NormalizedHash $target
      if ($existing -ne $entry.after) {
        throw "DRIFT: '$($entry.path)' already exists with different content than this batch provides. Aborting."
      }
    }
  } else {
    if (-not (Test-Path $target)) { throw "Missing target (cannot verify drift): $($entry.path)" }
    $existing = Get-NormalizedHash $target
    if ($existing -ne $entry.before) {
      throw "DRIFT DETECTED for '$($entry.path)': your file differs from the version this batch was built against. Aborting with no changes made."
    }
    $safeName = ($entry.path -replace '[\\/]', '__')
    Copy-Item $target (Join-Path $backupDir $safeName) -Force
  }
}
Write-Host "Drift check passed for all $($manifest.Count) file(s)."

# --- Apply + re-verify ---------------------------------------------------------
foreach ($entry in $manifest) {
  $target = Join-Path $repoRoot $entry.path
  $src    = Join-Path $filesDir $entry.path
  $dir    = Split-Path $target -Parent
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $srcBytes = [System.IO.File]::ReadAllBytes($src)
  Write-LfFile $target $srcBytes
  $applied = Get-NormalizedHash $target
  if ($applied -ne $entry.after) { throw "Apply verification failed for $($entry.path)" }
  Write-Host "  applied $($entry.path)"
}
Write-Host "All files applied and verified."

# --- Verification ---------------------------------------------------------------
if (-not $SkipVerification) {
  if (Get-Command go -ErrorAction SilentlyContinue) {
    $goFiles = @($manifest | Where-Object { $_.path -like "*.go" } | ForEach-Object { $_.path })
    if ($goFiles.Count -gt 0) {
      Write-Host "==> gofmt check"
      $unfmt = (& gofmt -l $goFiles 2>&1)
      if ($LASTEXITCODE -ne 0) { throw "gofmt failed" }
      if ($unfmt) { Write-Host $unfmt; throw "gofmt is not clean for this batch's Go files." }
    }
    Write-Host "==> go build ./..."
    & go build ./...
    if ($LASTEXITCODE -ne 0) { throw "go build failed" }
    Write-Host "==> go test ./internal/... ./cmd/... ./pkg/..."
    & go test ./internal/... ./cmd/... ./pkg/...
    if ($LASTEXITCODE -ne 0) { throw "go test failed" }
    Write-Host "Verification OK."
  } else {
    Write-Warning "`go` not found on PATH - skipping build/test. Run the CI suite or verify locally before merging."
  }
}

# --- Git: branch, commit, optional push ------------------------------------------
# Materialize the file list as an array first: `$manifest.path` on a single-entry
# manifest is a scalar string, and `foreach` over a string would iterate characters.
$paths = @($manifest | ForEach-Object { $_.path })
if (git rev-parse --verify "$Branch" 2>$null) {
  & git checkout "$Branch"
} else {
  & git checkout -b "$Branch"
}
foreach ($f in $paths) { & git add -- "$f" }
if (& git diff --cached --quiet) {
  Write-Host "No staged changes for this batch - nothing to commit."
} else {
  & git commit -m $CommitMessage
  if ($LASTEXITCODE -ne 0) { throw "git commit failed" }
  Write-Host "Committed on branch $Branch."
  if ($Push) {
    & git push --set-upstream origin $Branch
    if ($LASTEXITCODE -ne 0) { throw "git push failed" }
    Write-Host "Pushed $Branch to origin."
  }
}

Write-Host ""
Write-Host "Done. Review with: git show --stat"
Write-Host "Open a PR from $Branch into main when ready."
