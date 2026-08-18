# SEED_ADMINS.ps1  (self-contained — no separate .sql file, no `make` needed)
#
# Seeds SUPER_ADMIN + ACADEMIC_ADMIN operator accounts directly via psql.
#
# Usage:
#   A) LOCAL dev (default):
#        powershell -NoProfile -ExecutionPolicy Bypass -File .\SEED_ADMINS.ps1
#
#   B) STAGING / PRODUCTION (Render):
#        $env:DATABASE_URL = "postgres://user:pass@host:5432/db?sslmode=require"
#        powershell -NoProfile -ExecutionPolicy Bypass -File .\SEED_ADMINS.ps1
#
# The connection string is NOT committed anywhere and is only used in memory.

$ErrorActionPreference = "Stop"

# ── 1. Resolve the connection string ──────────────────────────────────────
$URL = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($URL)) {
    $URL = "postgres://nuvora:nuvora@localhost:5432/nuvora?sslmode=disable"
    Write-Host "Using LOCAL dev DB: postgres://nuvora:***@localhost:5432/nuvora" -ForegroundColor Yellow
} else {
    Write-Host "Using provided DATABASE_URL (target may be production - be careful)." -ForegroundColor Yellow
}

$IsProd = $URL -match "render\.com|amazonaws|supabase|elephantsql"
if ($IsProd) {
    Write-Host ""
    Write-Host "!! You are connecting to what looks like a REMOTE/PRODUCTION database." -ForegroundColor Red
    Write-Host "!! This creates accounts with KNOWN passwords. They grant full platform access." -ForegroundColor Red
    Write-Host "!! You MUST change these passwords via forgot-password after first login." -ForegroundColor Red
    $confirm = Read-Host "Type YES to continue against this database"
    if ($confirm -ne "YES") { Write-Host "Aborted." -ForegroundColor Yellow; exit 1 }
}

# ── 2. Locate psql ────────────────────────────────────────────────────────
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    # Common Windows install locations
    $candidates = @(
        "C:\Program Files\PostgreSQL\*\bin\psql.exe",
        "C:\Program Files\PostgreSQL\*\bin\psql.EXE"
    )
    foreach ($pat in $candidates) {
        $found = Get-ChildItem $pat -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
        if ($found) { $psql = $found.FullName; break }
    }
}
if (-not $psql) {
    Write-Host "ERROR: psql not found." -ForegroundColor Red
    Write-Host "Install PostgreSQL client, or run via the Docker postgres image:" -ForegroundColor Yellow
    Write-Host '  docker run --rm -e PGPASSWORD=nuvora postgres:16 psql "postgres://nuvora:nuvora@host.docker.internal:5432/nuvora" -f /dev/stdin' -ForegroundColor Yellow
    exit 1
}
$psqlCmd = if ($psql -is [string]) { $psql } else { $psql.Source }
Write-Host "Using psql: $psqlCmd" -ForegroundColor Cyan

# ── 3. The seed SQL (inline, UTF-8) ───────────────────────────────────────
# Passwords:
#   superadmin@nuvora.com  /  SuperAdmin@2026
#   admin@nuvora.com       /  Admin@2026
# (bcrypt-hashed, cost 10)
$SQL = @'
SET client_encoding = 'UTF8';

DO $$
DECLARE
  su_id UUID;
  ad_id UUID;
BEGIN
  -- SUPER_ADMIN
  INSERT INTO users (email, password_hash, status, timezone, email_verified_at, onboarded_at)
  VALUES ('superadmin@nuvora.com', '$2b$10$2L59AuV3tEo26YPp8amtauh3CuosWxnZBY0/XttzYNO.eJUyqANSS',
          'ACTIVE', 'Africa/Lagos', NOW(), NOW())
  ON CONFLICT (email) WHERE deleted_at IS NULL
  DO UPDATE SET deleted_at = NULL, status = 'ACTIVE', password_hash = EXCLUDED.password_hash
  RETURNING id INTO su_id;

  IF su_id IS NULL THEN
    UPDATE users SET deleted_at = NULL, status = 'ACTIVE',
           password_hash = '$2b$10$2L59AuV3tEo26YPp8amtauh3CuosWxnZBY0/XttzYNO.eJUyqANSS',
           email_verified_at = NOW(), onboarded_at = NOW()
     WHERE email = 'superadmin@nuvora.com' RETURNING id INTO su_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id)
  SELECT su_id, id FROM roles WHERE name = 'SUPER_ADMIN'
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RAISE NOTICE 'SUPER_ADMIN ready: superadmin@nuvora.com (id %)', su_id;

  -- ACADEMIC_ADMIN
  INSERT INTO users (email, password_hash, status, timezone, email_verified_at, onboarded_at)
  VALUES ('admin@nuvora.com', '$2b$10$Ezi/Pw03gabyzKfnZ1NCg.nwVoSS28gusH9lT1x3U7ImI8LtyLJsS',
          'ACTIVE', 'Africa/Lagos', NOW(), NOW())
  ON CONFLICT (email) WHERE deleted_at IS NULL
  DO UPDATE SET deleted_at = NULL, status = 'ACTIVE', password_hash = EXCLUDED.password_hash
  RETURNING id INTO ad_id;

  IF ad_id IS NULL THEN
    UPDATE users SET deleted_at = NULL, status = 'ACTIVE',
           password_hash = '$2b$10$Ezi/Pw03gabyzKfnZ1NCg.nwVoSS28gusH9lT1x3U7ImI8LtyLJsS',
           email_verified_at = NOW(), onboarded_at = NOW()
     WHERE email = 'admin@nuvora.com' RETURNING id INTO ad_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id)
  SELECT ad_id, id FROM roles WHERE name = 'ACADEMIC_ADMIN'
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RAISE NOTICE 'ACADEMIC_ADMIN ready: admin@nuvora.com (id %)', ad_id;
END $$;
'@

# ── 4. Run it (pipe the SQL into psql's stdin; -v ON_ERROR_STOP=1 stops on error) ──
$tmp = Join-Path $env:TEMP ("seed_admins_" + [guid]::NewGuid().ToString("N") + ".sql")
[System.IO.File]::WriteAllText($tmp, $SQL, (New-Object System.Text.UTF8Encoding($false)))

try {
    Write-Host ""
    Write-Host "==> Seeding admin accounts..." -ForegroundColor Cyan
    & $psqlCmd $URL -v ON_ERROR_STOP=1 -f $tmp
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Seed FAILED (exit $LASTEXITCODE)." -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    Write-Host "==> Done." -ForegroundColor Green
    Write-Host "   Login:  superadmin@nuvora.com / SuperAdmin@2026  (SUPER_ADMIN)" -ForegroundColor White
    Write-Host "   Login:  admin@nuvora.com / Admin@2026            (ACADEMIC_ADMIN)" -ForegroundColor White
    Write-Host "   >>> CHANGE THESE PASSWORDS after first login via forgot-password." -ForegroundColor Yellow
}
finally {
    Remove-Item $tmp -ErrorAction SilentlyContinue
}
