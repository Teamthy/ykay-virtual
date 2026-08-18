# FIX_LMS_ISADMIN.ps1
# Fixes the Vercel build type error in client/app/lms/page.tsx:
#   isAdmin from "@/features/auth/api" expects a CurrentUser object,
#   but we call isAdmin(user.roles) with a string[]. The useDashboardRoute
#   version accepts roles: string[] and matches our call site.
#
# Run from the repo root:
#   cd C:\Users\USER\Desktop\PROJECTS\ykay-virtual
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\FIX_LMS_ISADMIN.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

$file = "client/app/lms/page.tsx"
if (-not (Test-Path $file)) { Write-Host "ERROR: $file not found" -ForegroundColor Red; exit 1 }

$text = Get-Content $file -Raw -Encoding UTF8

$old = 'import { isAdmin } from "@/features/auth/api";'
$new = 'import { isAdmin } from "@/hooks/useDashboardRoute";'

if ($text.Contains($new)) {
    Write-Host "Already fixed - nothing to do." -ForegroundColor Green
    exit 0
}
if (-not $text.Contains($old)) {
    Write-Host "ERROR: could not find the exact line to replace." -ForegroundColor Red
    Write-Host "Current isAdmin import lines:" -ForegroundColor Red
    Select-String -Path $file -Pattern "isAdmin" -Encoding UTF8 | ForEach-Object { Write-Host "  $($_.LineNumber): $($_.Line)" }
    exit 1
}

$text = $text.Replace($old, $new)
# Write as UTF-8 WITHOUT BOM so git sees a clean text file.
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $file), $text, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Fixed import in $file" -ForegroundColor Green
Select-String -Path $file -Pattern "isAdmin" -Encoding UTF8 | ForEach-Object { Write-Host "  $($_.LineNumber): $($_.Line)" }

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1) git add client/app/lms/page.tsx" -ForegroundColor White
Write-Host "  2) git commit -m \"fix: use role-aware isAdmin(roles) in student LMS routing\"" -ForegroundColor White
Write-Host "  3) git push" -ForegroundColor White
Write-Host ""
Write-Host "Vercel will rebuild on push. Confirm the build goes green." -ForegroundColor Green
