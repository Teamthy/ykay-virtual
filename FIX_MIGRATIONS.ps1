# FIX_MIGRATIONS.ps1
# Overwrites the conflict-corrupted migration files with the correct content,
# and ensures the migration set is unique (000044 = IELTS removal, 000045 =
# demo-teachers removal). This bypasses patches entirely (the --3way merge left
# <<<<<<< markers in your files).
#
# Run from the repo root:
#   cd C:\Users\USER\Desktop\PROJECTS\ykay-virtual
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\FIX_MIGRATIONS.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

$dir = "migrations"

# ── 000044_remove_ielts_toefl_pte.up.sql (fixed — no phantom subject_subject) ──
$up44 = @'
-- 000044 — Remove IELTS, TOEFL and PTE catalogue rows.
--
-- These are removed from product scope. GMAT, GRE, SAT and ACT remain.
-- Only references real tables: programme_subjects, tutor_subjects,
-- exams, subjects.

-- Remove programme links.
DELETE FROM programme_subjects
WHERE subject_id IN (SELECT id FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep'));

-- Remove tutor links.
DELETE FROM tutor_subjects
WHERE subject_id IN (SELECT id FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep'));

-- Remove exam records.
DELETE FROM exams WHERE slug IN ('ielts','toefl','pte');

-- Remove subject records.
DELETE FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep');
'@

# ── 000044_remove_ielts_toefl_pte.down.sql ─────────────────────────────────────
$down44 = @'
-- 000044 down — re-add IELTS, TOEFL and PTE catalogue rows.

INSERT INTO exams (name, slug, description) VALUES
('IELTS','ielts','International English Language Testing System'),
('TOEFL','toefl','Test of English as Foreign Language'),
('PTE','pte','Pearson Test of English')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (name, slug, category) VALUES
('IELTS Prep','ielts-prep','Exam Preparation'),
('TOEFL Prep','toefl-prep','Exam Preparation'),
('PTE Prep','pte-prep','Exam Preparation')
ON CONFLICT (slug) DO NOTHING;
'@

# ── 000045_remove_demo_teachers.up.sql ─────────────────────────────────────────
$up45 = @'
-- 000045 — Remove DEMO / MARKETING tutor profiles, their demo programmes and
-- demo cohorts, so ONLY real, admin-approved (verified) tutors are shown on
-- the tutors page.
--
-- Real tutors who register and pass vetting are unaffected.

DO $$
DECLARE
  v_user uuid;
BEGIN
  -- 1. Remove demo cohorts.
  DELETE FROM cohorts WHERE slug LIKE 'demo-cohort-%';

  -- 2. Remove demo programmes (cascades to cohort links via ON DELETE CASCADE).
  DELETE FROM programmes WHERE slug LIKE 'demo-programme-%';

  -- 3. Remove demo + marketing tutor profiles and their user rows.
  FOR v_user IN
    SELECT u.id FROM users u
    WHERE u.email ILIKE 'tutor%@nuvora.test'
       OR u.email ILIKE 'tutor.%@nuvora.test'
  LOOP
    DELETE FROM tutor_profiles WHERE user_id = v_user;
    DELETE FROM user_roles WHERE user_id = v_user;
    DELETE FROM sessions WHERE user_id = v_user;
  END LOOP;
  DELETE FROM users
  WHERE email ILIKE 'tutor%@nuvora.test'
     OR email ILIKE 'tutor.%@nuvora.test';

  -- 4. Also remove the demo parent/student identities (non-production).
  DELETE FROM parent_student_links WHERE parent_user_id IN (
    SELECT id FROM users WHERE email IN ('demo.parent@nuvora.test','demo.student@nuvora.test')
  );
  DELETE FROM users WHERE email IN ('demo.parent@nuvora.test','demo.student@nuvora.test');
END $$;
'@

# ── 000045_remove_demo_teachers.down.sql ───────────────────────────────────────
$down45 = @'
-- 000045 down — best-effort note.
-- Re-adding the demo/marketing tutor fixtures is intentional (they are not
-- production data). To restore marketing tutors, re-run migration 000041.
SELECT 1;
'@

# ── Write the files ───────────────────────────────────────────────────────────
$utf8 = New-Object System.Text.UTF8Encoding($false)

$files = @(
  @{ path = "$dir\000044_remove_ielts_toefl_pte.up.sql";    content = $up44 },
  @{ path = "$dir\000044_remove_ielts_toefl_pte.down.sql";  content = $down44 },
  @{ path = "$dir\000045_remove_demo_teachers.up.sql";      content = $up45 },
  @{ path = "$dir\000045_remove_demo_teachers.down.sql";    content = $down45 }
)

# Remove any stray 000044 demo-teachers files (old numbering collision).
foreach ($old in @(
  "$dir\000044_remove_demo_teachers.up.sql",
  "$dir\000044_remove_demo_teachers.down.sql"
)) {
  if (Test-Path $old) { Remove-Item $old -Force; Write-Host "Removed stale: $old" -ForegroundColor Yellow }
}

foreach ($f in $files) {
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) $f.path), $f.content, $utf8)
  Write-Host "Wrote $($f.path)" -ForegroundColor Green
}

# ── Verify no conflict markers remain ─────────────────────────────────────────
Write-Host ""
Write-Host "==> Checking for leftover conflict markers..." -ForegroundColor Cyan
$markers = Select-String -Path "$dir\000044_*.sql","$dir\000045_*.sql" -Pattern "<<<<<<<|=======|>>>>>>>" -ErrorAction SilentlyContinue
if ($markers) {
  Write-Host "Conflict markers STILL present — manual fix needed." -ForegroundColor Red
  $markers | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber)" }
  exit 1
} else {
  Write-Host "No conflict markers. Clean." -ForegroundColor Green
}

# ── Verify unique version numbers ─────────────────────────────────────────────
Write-Host ""
Write-Host "==> Checking migration versions are unique..." -ForegroundColor Cyan
$ups = Get-ChildItem "$dir\*.up.sql" | ForEach-Object { $_.Name -replace '^0*','' -replace '_up\.sql$','' }
$dups = $ups | Group-Object | Where-Object { $_.Count -gt 1 }
if ($dups) {
  Write-Host "DUPLICATE versions:" -ForegroundColor Red
  $dups | ForEach-Object { Write-Host "  version $($_.Name) appears $($_.Count)x" }
  exit 1
} else {
  Write-Host "All versions unique. Ready." -ForegroundColor Green
}

Write-Host ""
Write-Host "Now run: go run ./cmd/migrate --cmd=up" -ForegroundColor Cyan
