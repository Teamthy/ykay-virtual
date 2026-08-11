<#
.SYNOPSIS
  YKAY Virtual School — commit & push helper with professional git workflow.

.DESCRIPTION
  Safe wrapper around git for pushing YKAY work to GitHub:
    1. Verifies git, the repository and the remote (auto-adds it if missing).
    2. Fetches latest and syncs the base branch.
    3. Creates or switches to a well-named feature branch.
    4. Stages everything (honouring .gitignore), commits with a conventional message.
    5. Pushes the branch and, optionally, fast-forward merges it into main and pushes main.
    6. Optionally tags the release point and pushes tags.

.EXAMPLE
  # Push current branch as-is (creates a conventional commit if there are changes)
  .\scripts\git-commit-push.ps1

.EXAMPLE
  # Backend wave: dedicated branch, merged to main after push, with a tag
  .\scripts\git-commit-push.ps1 -BranchName "feature/wave-2-backend" -MergeToMain -Tag "wave-2-backend"

.PARAMETER BranchName
  Branch to commit on. Created from -BaseBranch when it does not exist yet.

.PARAMETER CommitMessage
  Conventional commit message (e.g. "feat(api): auth with JWT"). When empty, a
  default message is generated from the branch name (feature/foo -> "feat(foo): update").

.PARAMETER BaseBranch
  Branch the feature branch is based on. Default: main.

.PARAMETER RepoUrl
  GitHub remote URL, used ONLY when the repo has no "origin" remote yet
  (e.g. right after downloading the project folder).

.PARAMETER MergeToMain
  After pushing the feature branch: fast-forward it into -BaseBranch and push that too.

.PARAMETER Tag
  If provided, create an annotated tag at the pushed tip (or at base after merge)
  and push tags.

.PARAMETER SkipFetch
  Do not fetch/pull before working (offline or CI use).
#>
[CmdletBinding()]
param(
    [string]$BranchName = "",
    [string]$CommitMessage = "",
    [string]$BaseBranch = "main",
    [string]$RepoUrl = "https://github.com/Teamthy/ykay-virtual.git",
    [switch]$MergeToMain,
    [string]$Tag = "",
    [switch]$SkipFetch
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step  { param([string]$Msg) Write-Host "`n==> $Msg" -ForegroundColor Cyan }
function Write-OK    { param([string]$Msg) Write-Host "  OK: $Msg" -ForegroundColor Green }
function Write-Warn  { param([string]$Msg) Write-Host "  WARN: $Msg" -ForegroundColor Yellow }
function Write-Fail  { param([string]$Msg) Write-Host "  FAIL: $Msg" -ForegroundColor Red }

function Invoke-Git {
    param([string[]]$Args, [bool]$Check = $false)
    $out = & git @Args 2>&1
    if ($LASTEXITCODE -ne 0) {
        if ($Check) { return $null }
        throw "git $($Args -join ' ') failed:`n$($out | Out-String)"
    }
    return ($out -join "`n")
}

# ---------------------------------------------------------------- locate repo
$RepoRoot = $PSScriptRoot
if ((Split-Path -Leaf $RepoRoot) -eq "scripts") { $RepoRoot = Split-Path $RepoRoot -Parent }
Set-Location $RepoRoot
Write-Step "Working in $RepoRoot"

# ---------------------------------------------------------------- git present?
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "git is not installed or not on PATH. Install Git for Windows: https://git-scm.com/download/win"
}
$GitVersion = & git --version
Write-OK $GitVersion

# ---------------------------------------------------------------- init if needed
if (-not (Test-Path ".git")) {
    Write-Warn "No .git found — initialising a fresh repository."
    & git init -b $BaseBranch 2>$null
    if ($LASTEXITCODE -ne 0) { & git init; & git branch -M $BaseBranch }
    Write-OK "Repository initialised"
}

# ---------------------------------------------------------------- identity
$Name = & git config user.name
if (-not $Name) {
    $Name = Read-Host "git user.name is not set. Enter your name (e.g. 'Yinka Oladimeji')"
    if ([string]::IsNullOrWhiteSpace($Name)) { $Name = "YKAY Dev" }
    & git config user.name $Name
    Write-OK "Set local git user.name = $Name"
}
$Email = & git config user.email
if (-not $Email) {
    $Email = Read-Host "git user.email is not set. Enter your email (e.g. 'you@example.com')"
    if ([string]::IsNullOrWhiteSpace($Email)) { $Email = "dev@ykayvirtual.com" }
    & git config user.email $Email
    Write-OK "Set local git user.email = $Email"
}

# ---------------------------------------------------------------- remote
$Remote = Invoke-Git @("remote", "get-url", "origin") -Check $true
if (-not $Remote) {
    Write-Warn "No 'origin' remote found — adding $RepoUrl"
    & git remote add origin $RepoUrl
    if ($LASTEXITCODE -ne 0) { throw "Could not add remote. Check your network." }
    Write-OK "Remote added: $RepoUrl"
}
else {
    Write-OK "Remote origin -> $Remote"
}

# ---------------------------------------------------------------- fetch
if (-not $SkipFetch) {
    Write-Step "Fetching latest from origin"
    $out = & git fetch --prune origin 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Fetch failed. Are you authenticated with GitHub?"
        Write-Host "  Hint: use 'git credential-manager' on Windows, or create a PAT at"
        Write-Host "  https://github.com/settings/tokens and use it as the password."
        Write-Host ""
        Write-Host $out
        throw "git fetch failed"
    }
    Write-OK "Fetch complete"
}
else { Write-Warn "Skipping fetch (-SkipFetch)" }

# ---------------------------------------------------------------- base branch local
$HasBaseLocal = & git show-ref --verify --quiet "refs/heads/$BaseBranch"
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Base branch '$BaseBranch' missing locally — tracking origin/$BaseBranch"
    & git switch -c $BaseBranch --track "origin/$BaseBranch"
    if ($LASTEXITCODE -ne 0) { throw "Could not create $BaseBranch from origin" }
}

if (-not $SkipFetch) {
    & git switch $BaseBranch 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Could not switch to $BaseBranch" }
    & git pull --ff-only origin $BaseBranch 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Warn "Base branch not in sync (or new branch). Continuing anyway." }
}

# ---------------------------------------------------------------- feature branch
$TargetBranch = $BranchName
if (-not $TargetBranch) { $TargetBranch = & git rev-parse --abbrev-ref HEAD }
$TargetBranch = $TargetBranch.Trim()

$HasRemoteBranch = & git ls-remote --heads origin $TargetBranch 2>$null
if (-not (Invoke-Git @("show-ref", "--verify", "--quiet", "refs/heads/$TargetBranch") -Check $true) -and $TargetBranch -ne $BaseBranch) {
    Write-Step "Creating branch '$TargetBranch' from '$BaseBranch'"
    & git switch -c $TargetBranch $BaseBranch
    if ($LASTEXITCODE -ne 0) { throw "Could not create branch $TargetBranch" }
}
elseif ($TargetBranch -ne $BaseBranch) {
    Write-Step "Switching to existing branch '$TargetBranch'"
    & git switch $TargetBranch 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Could not switch to $TargetBranch" }
    if ($HasRemoteBranch) {
        & git pull --ff-only origin $TargetBranch 2>$null
        if ($LASTEXITCODE -ne 0) { Write-Warn "Remote branch ahead — not fast-forwarding. Resolve before pushing." }
    }
}
Write-OK "On branch: $TargetBranch"

# ---------------------------------------------------------------- stage + commit
$Status = & git status --porcelain
if ($Status) {
    Write-Step "Staging all changes ($($Status.Count) file(s))"
    & git add -A
    if ($LASTEXITCODE -ne 0) { throw "git add failed" }

    if (-not $CommitMessage) {
        # derive conventional message from branch name
        $Parts = $TargetBranch -split "/", 2
        $Prefix = switch ($Parts[0]) {
            "feature" { "feat" }; "fix" { "fix" }; "docs" { "docs" }
            "chore" { "chore" }; "refactor" { "refactor" }; "test" { "test" }
            default { "chore" }
        }
        $Scope = if ($Parts.Count -gt 1) { $Parts[1] } else { $TargetBranch }
        $CommitMessage = "$Prefix($Scope): update YKAY virtual school"
    }
    & git commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) { throw "git commit failed (are there merge conflicts?)" }
    Write-OK "Committed: $CommitMessage"
}
else {
    Write-Warn "Nothing to commit — working tree is clean."
}

# ---------------------------------------------------------------- push
$LocalSha = & git rev-parse HEAD
Write-Step "Pushing '$TargetBranch'"
if ($HasRemoteBranch) { & git push origin $TargetBranch }
else { & git push -u origin $TargetBranch }
if ($LASTEXITCODE -ne 0) { throw "Push failed — check credentials/permissions." }
Write-OK "Pushed $TargetBranch -> $($LocalSha.Substring(0,8))"

# ---------------------------------------------------------------- merge to base
if ($MergeToMain -and $TargetBranch -ne $BaseBranch) {
    Write-Step "Fast-forward merging '$TargetBranch' into '$BaseBranch'"
    & git switch $BaseBranch
    if ($LASTEXITCODE -ne 0) { throw "Could not switch to $BaseBranch" }
    & git pull --ff-only origin $BaseBranch 2>$null
    & git merge --ff-only $TargetBranch
    if ($LASTEXITCODE -ne 0) { throw "Fast-forward merge failed. Review 'git log $BaseBranch..$TargetBranch'." }
    & git push origin $BaseBranch
    if ($LASTEXITCODE -ne 0) { throw "Could not push $BaseBranch" }
    Write-OK "$BaseBranch updated and pushed"
}

# ---------------------------------------------------------------- tag
if ($Tag) {
    Write-Step "Tagging $Tag"
    & git tag -a $Tag -m "YKAY Virtual School — $Tag"
    & git push origin $Tag
    Write-OK "Tag pushed: $Tag"
}

# ---------------------------------------------------------------- summary
Write-Step "Done."
$Bare = $TargetBranch -replace "/", "%2F"
Write-Host ""
Write-Host "  Branch : $TargetBranch"
Write-Host "  Commit : $($LocalSha.Substring(0,8))"
Write-Host "  PR     : https://github.com/Teamthy/ykay-virtual/compare/$BaseBranch...$Bare?expand=1"
Write-Host ""
Write-Host "  Tip: open that compare URL to create a pull request on GitHub."
