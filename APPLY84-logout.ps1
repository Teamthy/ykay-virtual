# APPLY84-logout.ps1 — run from repo root after APPLY84.ps1 failed on logout
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\client\components\layout\PageHero.tsx')) { throw 'Run from ykay-virtual repo root.' }
$utf8 = New-Object System.Text.UTF8Encoding $false
New-Item -ItemType Directory -Force -Path 'client\app\logout' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession, useLogout } from "@/hooks/useSession";
import { homeForRoles } from "@/hooks/useDashboardRoute";

// Dedicated logout confirmation — replaces window.confirm in the header
// and dashboard chrome so the choice is a real screen, not a browser dialog.

export default function LogoutPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const doLogout = useLogout();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stayHref = user ? homeForRoles(user.roles) : "/";

  const confirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      await doLogout();
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : "Could not log out. Try again.");
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-surface px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-ink-100 bg-white p-8 shadow-card">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400">Session</p>
        <h1 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">Log out of NUVORA?</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          {isLoading
            ? "Checking your session…"
            : user
              ? `You are signed in as ${user.email}. Logging out ends this session on this device.`
              : "You are not signed in on this device."}
        </p>

        {err && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {err}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-navy px-5 text-sm font-bold text-white hover:bg-brand-navy/90 disabled:opacity-50"
              >
                {busy ? "Logging out…" : "Yes, log out"}
              </button>
              <button
                type="button"
                onClick={() => router.push(stayHref)}
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-ink-300 px-5 text-sm font-bold text-ink-800 hover:border-brand-navy"
              >
                Stay signed in
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-brand-gold px-5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
            >
              Go to log in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\logout\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/logout/page.tsx'

function Unwrap-PageHero([string]$rel) {
  $path = Join-Path (Get-Location) $rel
  if (-not (Test-Path $path)) { Write-Host "skip missing $rel"; return }
  $t = [System.IO.File]::ReadAllText($path)
  if ($t -notmatch 'PageHero') { return }
  $m = [regex]::Match($t, '<main([^>]*className="[^"]*container-x[^"]*"[^>]*)>')
  if (-not $m.Success) { Write-Host "already full-bleed or no wrap: $rel"; return }
  $open = $m.Groups[0].Value
  $clsM = [regex]::Match($open, 'className="([^"]*)"')
  $tokens = $clsM.Groups[1].Value.Split(@(' '), [StringSplitOptions]::RemoveEmptyEntries)
  $inner = @('container-x') + @($tokens | Where-Object { $_ -like 'py-*' -or $_ -like 'pb-*' -or $_ -like 'pt-*' })
  $outer = @($tokens | Where-Object { $_ -ne 'container-x' -and $_ -notlike 'py-*' -and $_ -notlike 'pb-*' -and $_ -notlike 'pt-*' })
  if ($outer.Count -gt 0) {
    $newOpen = [regex]::Replace($open, 'className="[^"]*"', ('className="' + ($outer -join ' ') + '"'), 1)
  } else {
    $newOpen = [regex]::Replace($open, '\s*className="[^"]*"', '', 1)
  }
  $start = $t.IndexOf('<PageHero')
  if ($start -lt 0 -or $start -lt $m.Index) { Write-Host "skip hero $rel"; return }
  $named = $t.IndexOf('</PageHero>', $start)
  $selfc = $t.IndexOf('/>', $start)
  if ($named -ge 0 -and ($selfc -lt 0 -or $named -lt $selfc)) { $end = $named + 11 } elseif ($selfc -ge 0) { $end = $selfc + 2 } else { return }
  $prefix = $t.Substring(0, $m.Index) + $newOpen + $t.Substring($m.Index + $m.Length, $start - ($m.Index + $m.Length))
  $hero = $t.Substring($start, $end - $start)
  $suffix = $t.Substring($end)
  $last = $suffix.LastIndexOf('</main>')
  if ($last -lt 0) { return }
  $innerHtml = $suffix.Substring(0, $last)
  $after = $suffix.Substring($last)
  $new = $prefix + "`n      " + $hero + "`n`n      <div className=`"" + ($inner -join ' ') + "`">" + $innerHtml + "`n      </div>`n    " + $after
  [System.IO.File]::WriteAllText($path, $new.Replace("`r`n","`n"), $utf8)
  Write-Host "unwrapped $rel"
}

$unwrap = @(
  'client\app\(marketing)\about\page.tsx',
  'client\app\(marketing)\exam-prep\page.tsx',
  'client\app\(marketing)\how-it-works\page.tsx',
  'client\app\(marketing)\programmes\page.tsx',
  'client\app\(marketing)\subjects\page.tsx',
  'client\app\(marketing)\cohorts\page.tsx',
  'client\app\(marketing)\contact\page.tsx',
  'client\app\(marketing)\careers\page.tsx',
  'client\app\(marketing)\blog\page.tsx',
  'client\app\(marketing)\become-tutor\page.tsx',
  'client\app\(marketing)\corporate-training\page.tsx',
  'client\app\(marketing)\for-schools\page.tsx',
  'client\app\(marketing)\online-classes\page.tsx',
  'client\app\(marketing)\resources\page.tsx',
  'client\app\(marketing)\success-stories\page.tsx',
  'client\app\(marketing)\curricula\british\page.tsx',
  'client\app\(marketing)\curricula\nigerian\page.tsx',
  'client\app\help\page.tsx'
)
foreach ($p in $unwrap) { Unwrap-PageHero $p }

function Ensure-Cover([string]$rel, [string]$cover) {
  $path = Join-Path (Get-Location) $rel
  if (-not (Test-Path $path)) { return }
  $t = [System.IO.File]::ReadAllText($path)
  if ($t -notmatch 'PageHero') { return }
  if ($t -match 'cover=') { return }
  $t2 = $t.Replace('<PageHero', "<PageHero`n        cover=`"$cover`"")
  if ($t2 -ne $t) {
    [System.IO.File]::WriteAllText($path, $t2.Replace("`r`n","`n"), $utf8)
    Write-Host "cover $rel"
  }
}
Ensure-Cover 'client\app\(marketing)\about\page.tsx' '/hero/about.jpg'
Ensure-Cover 'client\app\(marketing)\exam-prep\page.tsx' '/hero/exam-prep.jpg'
Ensure-Cover 'client\app\(marketing)\how-it-works\page.tsx' '/hero/how-it-works.jpg'
Ensure-Cover 'client\app\(marketing)\programmes\page.tsx' '/hero/programmes.jpg'
Ensure-Cover 'client\app\(marketing)\subjects\page.tsx' '/hero/subjects.jpg'
Ensure-Cover 'client\app\(marketing)\cohorts\page.tsx' '/hero/cohorts.jpg'
Ensure-Cover 'client\app\(marketing)\online-classes\page.tsx' '/hero/programmes.jpg'
Ensure-Cover 'client\app\(marketing)\curricula\british\page.tsx' '/hero/british.jpg'
Ensure-Cover 'client\app\(marketing)\curricula\nigerian\page.tsx' '/hero/nigerian.jpg'

Write-Host 'Done. git add / commit / push the layout + logout + marketing pages. Do not add APPLY84*.ps1 or root jpgs.'
