<#
.SYNOPSIS
  YKAY Virtual School — Root Folder Sync, Commit & Remote Push Helper (Waves 1–5)

.DESCRIPTION
  This PowerShell script is designed to be executed directly from your repository root folder:
    PS C:\Users\USER\Desktop\PROJECTS\ykay-virtual> .\commit-and-push.ps1

  It performs the following automated steps:
    1. Verifies Git installation and initializes/configures user identity if missing.
    2. Checks for the portable git bundle ('ykay-virtual-waves1-5.bundle') in the root folder.
       If present, it automatically pulls all Waves 1–5 commits and tags into your local branch.
    3. Stages any new, modified, or untracked files in your root folder ('git add -A').
    4. Creates a clean conventional commit if there are uncommitted changes.
    5. Pushes your local branch AND annotated tags ('v1.0.0-waves1-5') to GitHub remote.

.EXAMPLE
  PS C:\Users\USER\Desktop\PROJECTS\ykay-virtual> .\commit-and-push.ps1
#>

[CmdletBinding()]
param(
    [string]$CommitMessage = "feat: complete Waves 1-5 production delivery with verified AC-01 to AC-12",
    [string]$BranchName = "main",
    [string]$RemoteUrl = "https://github.com/Teamthy/ykay-virtual.git",
    [string]$BundleFile = "ykay-virtual-waves1-5.bundle"
)

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$Msg) Write-Host "`n==> $Msg" -ForegroundColor Cyan }
function Write-OK   { param([string]$Msg) Write-Host "  OK: $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "  WARN: $Msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$Msg) Write-Host "  FAIL: $Msg" -ForegroundColor Red }

# 1. Verify working directory is repository root
$RootPath = $PSScriptRoot
if (-not $RootPath) { $RootPath = Get-Location }
Set-Location $RootPath
Write-Step "Working directory: $RootPath"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Fail "Git is not installed or not in PATH."
    throw "Please install Git for Windows (https://git-scm.com/download/win)."
}

# 2. Check repository initialization & remote
if (-not (Test-Path ".git")) {
    Write-Warn "No .git folder found. Initializing repository..."
    git init -b $BranchName
    git remote add origin $RemoteUrl
    Write-OK "Initialized repository and added remote origin -> $RemoteUrl"
} else {
    $currentRemote = git remote get-url origin 2>$null
    if (-not $currentRemote) {
        git remote add origin $RemoteUrl
        Write-OK "Added remote origin -> $RemoteUrl"
    } else {
        Write-OK "Remote origin configured -> $currentRemote"
    }
}

# 3. Ensure local identity is configured
$gitName = git config user.name 2>$null
if (-not $gitName) {
    git config user.name "Ykay Engineering Team"
    Write-OK "Configured git user.name -> Ykay Engineering Team"
}
$gitEmail = git config user.email 2>$null
if (-not $gitEmail) {
    git config user.email "engineering@ykay.ng"
    Write-OK "Configured git user.email -> engineering@ykay.ng"
}

# 4. Check if portable bundle exists in root and pull Waves 1-5 commits
if (Test-Path $BundleFile) {
    Write-Step "Found '$BundleFile' in root folder. Verifying and applying..."
    $verify = git bundle verify $BundleFile 2>&1
    if ($LASTEXITCODE -eq 0) {
        git pull $BundleFile $BranchName --tags
        Write-OK "Successfully merged Waves 1-5 commits & tags from '$BundleFile'"
    } else {
        Write-Warn "Bundle check warning: $verify"
    }
} else {
    Write-OK "No local bundle file '$BundleFile' found. Proceeding with workspace files."
}

# 5. Stage all files in root folder
Write-Step "Staging all workspace files..."
git add -A
Write-OK "All files staged."

# 6. Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Step "Committing changes with message: '$CommitMessage'"
    git commit -m $CommitMessage
    Write-OK "Commit created successfully."
} else {
    Write-OK "Working tree clean (no new changes to commit)."
}

# 7. Push branch and tags to GitHub remote
Write-Step "Pushing branch '$BranchName' and tags to origin..."
try {
    git push -u origin $BranchName --tags
    Write-OK "Successfully pushed '$BranchName' and tags ('v1.0.0-waves1-5') to remote!"
} catch {
    Write-Fail "Push failed. Authentication required."
    Write-Host "`n=== GITHUB AUTHENTICATION HINT ===" -ForegroundColor Yellow
    Write-Host "If GitHub rejected your push, authenticate using one of these methods:"
    Write-Host "  1. Git Credential Manager (a Windows prompt should appear automatically)."
    Write-Host "  2. Use your GitHub Personal Access Token (PAT) in the URL:"
    Write-Host "     git remote set-url origin https://<YOUR_TOKEN>@github.com/Teamthy/ykay-virtual.git"
    Write-Host "     git push -u origin $BranchName --tags`n"
    throw
}

Write-Step "YKAY Virtual School deployment push complete!"
