# APPLY86.ps1 — dark-on-dark contrast. Run from repo root.
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\client\app\globals.css')) { throw 'Run from ykay-virtual repo root.' }
$utf8 = New-Object System.Text.UTF8Encoding $false

New-Item -ItemType Directory -Force -Path 'client\app' | Out-Null
$content = @'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* stylelint-disable-next-line at-rule-no-unknown */
@layer base, components, utilities;

/* ============================================================
   NUVORA DESIGN SYSTEM
   Green / Deep Green / Black / Peach
   Typography: Anton + DM Sans
   ============================================================ */


/* ============================================================
   1. DESIGN TOKENS
   ============================================================ */

:root {
  /* ----------------------------------------------------------
     Typography
     ---------------------------------------------------------- */

  --font-display: "Anton", system-ui, sans-serif;
  --font-body: "DM Sans", system-ui, sans-serif;


  /* ----------------------------------------------------------
     Brand Colors
     ---------------------------------------------------------- */

  --color-primary: #70F250;
  --color-primary-hover: #5FE63F;
  --color-primary-dark: #4CCB31;
  --color-primary-light: #DFFFF2;

  --color-deep-green: #013920;
  --color-deep-green-light: #0A4D32;
  --color-deep-green-dark: #002A18;

  --color-black: #000000;
  --color-white: #FFFFFF;

  --color-peach: #FFF7E4;
  --color-peach-dark: #F8EBCF;


  /* ----------------------------------------------------------
     Backgrounds
     ---------------------------------------------------------- */

  --color-background: #FFF7E4;
  --color-background-soft: #FFFFFF;
  --color-background-muted: #F8EBCF;

  --color-surface: #FFFFFF;
  --color-surface-muted: #F8EBCF;
  --color-surface-dark: #013920;


  /* ----------------------------------------------------------
     Text
     ---------------------------------------------------------- */

  --color-text: #000000;
  --color-text-primary: #000000;
  --color-text-secondary: #013920;
  --color-text-muted: #52645B;

  --color-text-on-primary: #000000;
  --color-text-on-dark: #FFFFFF;


  /* ----------------------------------------------------------
     Borders
     ---------------------------------------------------------- */

  --color-border: #DCE5DE;
  --color-border-light: #EDE8DC;
  --color-border-dark: #285442;


  /* ----------------------------------------------------------
     Semantic Colors
     ---------------------------------------------------------- */

  --color-success: #4CCB31;
  --color-success-light: #E6FFDE;

  --color-error: #D83A3A;
  --color-error-light: #FDECEC;

  --color-warning: #F4B400;
  --color-warning-light: #FFF3C4;

  --color-info: #013920;
  --color-info-light: #DFFFF2;


  /* ----------------------------------------------------------
     Legacy aliases
     ----------------------------------------------------------
     These allow older components to continue working while
     gradually migrating to the Nuvora naming convention.
     ---------------------------------------------------------- */

  --text-primary: var(--color-text-primary);
  --text-secondary: var(--color-text-secondary);
  --text-muted: var(--color-text-muted);
  --text-link: var(--color-deep-green);
  --text-link-hover: var(--color-primary-dark);


  /* ----------------------------------------------------------
     Shadows
     ---------------------------------------------------------- */

  --shadow-sm:
    0 2px 8px rgba(1, 57, 32, 0.06);

  --shadow-md:
    0 8px 24px rgba(1, 57, 32, 0.10);

  --shadow-lg:
    0 16px 40px rgba(1, 57, 32, 0.14);

  --shadow-xl:
    0 24px 60px rgba(1, 57, 32, 0.18);


  /* ----------------------------------------------------------
     Border Radius
     ---------------------------------------------------------- */

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-full: 9999px;


  /* ----------------------------------------------------------
     Layout
     ---------------------------------------------------------- */

  --container-width: 1400px;
  --container-padding: 24px;
}


/* ============================================================
   2. BASE RESET
   ============================================================ */

@layer base {

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }


  html {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
    text-rendering: optimizeLegibility;
  }


  body {
    margin: 0;
    min-height: 100vh;

    background-color: var(--color-background);
    color: var(--color-text);

    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.5;

    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }


  /* ----------------------------------------------------------
     Typography
     ---------------------------------------------------------- */

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 0;

    font-family: var(--font-display);

    /* Inherit so navy/photo bands with `text-white` stay readable.
       Body still supplies the default ink color. */
    color: inherit;

    font-weight: 400;
    line-height: 1.05;
    letter-spacing: -0.02em;

    font-synthesis: none;
    text-wrap: balance;
  }


  h1 {
    font-size: clamp(3rem, 7vw, 7rem);
  }


  h2 {
    font-size: clamp(2.5rem, 5vw, 5rem);
  }


  h3 {
    font-size: clamp(2rem, 3.5vw, 3.5rem);
  }


  h4 {
    font-size: clamp(1.5rem, 2.5vw, 2.25rem);
  }


  h5 {
    font-size: 1.5rem;
  }


  h6 {
    font-size: 1.25rem;
  }


  p {
    margin: 0;

    color: inherit;

    font-family: var(--font-body);
    line-height: 1.7;
  }


  strong,
  b {
    font-weight: 700;
  }


  a {
    color: var(--color-deep-green);
    text-decoration: none;

    transition:
      color 0.2s ease,
      opacity 0.2s ease;
  }


  a:hover {
    color: var(--color-primary-dark);
  }

  /* Dark / photo surfaces: do not paint deep-green links or black headings. */
  .text-white a,
  .bg-brand-navy a,
  .bg-ink-900 a,
  .section-dark-green a,
  .section-black a {
    color: inherit;
  }

  .text-white a:hover,
  .bg-brand-navy a:hover,
  .bg-ink-900 a:hover,
  .section-dark-green a:hover,
  .section-black a:hover {
    color: var(--color-primary);
  }


  /* ----------------------------------------------------------
     Forms
     ---------------------------------------------------------- */

  button,
  input,
  textarea,
  select {
    margin: 0;

    font: inherit;
  }


  button {
    cursor: pointer;
  }


  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }


  input,
  textarea,
  select {
    color: var(--color-text);
  }


  textarea {
    resize: vertical;
  }


  /* ----------------------------------------------------------
     Media
     ---------------------------------------------------------- */

  img,
  picture,
  video,
  canvas,
  svg {
    display: block;
    max-width: 100%;
  }


  img,
  video {
    height: auto;
  }


  /* ----------------------------------------------------------
     Lists
     ---------------------------------------------------------- */

  ul,
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }


  /* ----------------------------------------------------------
     Selection
     ---------------------------------------------------------- */

  ::selection {
    background: var(--color-primary);
    color: var(--color-black);
  }


  /* ----------------------------------------------------------
     Scrollbar
     ---------------------------------------------------------- */

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }


  ::-webkit-scrollbar-track {
    background: var(--color-peach);
  }


  ::-webkit-scrollbar-thumb {
    background: var(--color-deep-green);
    border-radius: var(--radius-full);
  }


  ::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary-dark);
  }
}


/* ============================================================
   3. TYPOGRAPHY UTILITIES
   ============================================================ */

@layer utilities {

  .font-display {
    font-family: var(--font-display);
    font-weight: 400;
    font-synthesis: none;
  }


  .font-body {
    font-family: var(--font-body);
  }


  .text-display {
    font-family: var(--font-display);
    font-weight: 400;
    line-height: 0.95;
    letter-spacing: -0.025em;
  }


  .text-balance {
    text-wrap: balance;
  }


  .text-pretty {
    text-wrap: pretty;
  }
}


/* ============================================================
   4. LAYOUT COMPONENTS
   ============================================================ */

@layer components {

  .container-x {
    width: 100%;
    max-width: var(--container-width);

    margin-left: auto;
    margin-right: auto;

    padding-left: var(--container-padding);
    padding-right: var(--container-padding);
  }


  /* ----------------------------------------------------------
     Section containers
     ---------------------------------------------------------- */

  .section {
    width: 100%;
    padding-top: 96px;
    padding-bottom: 96px;
  }


  .section-sm {
    width: 100%;
    padding-top: 64px;
    padding-bottom: 64px;
  }


  .section-lg {
    width: 100%;
    padding-top: 128px;
    padding-bottom: 128px;
  }


  /* ----------------------------------------------------------
     Page backgrounds
     ---------------------------------------------------------- */

  .section-peach {
    background: var(--color-peach);
    color: var(--color-black);
  }


  .section-green {
    background: var(--color-primary);
    color: var(--color-black);
  }


  .section-dark-green {
    background: var(--color-deep-green);
    color: var(--color-white);
  }


  .section-black {
    background: var(--color-black);
    color: var(--color-white);
  }


  .section-white {
    background: var(--color-white);
    color: var(--color-black);
  }
}


/* ============================================================
   5. BUTTON SYSTEM
   ============================================================ */

@layer components {

  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    padding: 14px 24px;

    background: var(--color-primary);
    color: var(--color-black);

    border: 1.5px solid var(--color-primary);
    border-radius: var(--radius-full);

    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1;

    transition:
      transform 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }


  .btn-primary:hover {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);

    transform: translateY(-2px);

    box-shadow: var(--shadow-md);
  }


  .btn-primary:active {
    transform: translateY(0);
  }


  /* ----------------------------------------------------------
     Deep Green
     ---------------------------------------------------------- */

  .btn-dark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    padding: 14px 24px;

    background: var(--color-deep-green);
    color: var(--color-white);

    border: 1.5px solid var(--color-deep-green);
    border-radius: var(--radius-full);

    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1;

    transition:
      transform 0.2s ease,
      background-color 0.2s ease,
      box-shadow 0.2s ease;
  }


  .btn-dark:hover {
    background: var(--color-deep-green-light);
    border-color: var(--color-deep-green-light);

    transform: translateY(-2px);

    box-shadow: var(--shadow-md);
  }


  /* ----------------------------------------------------------
     Black
     ---------------------------------------------------------- */

  .btn-black {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    padding: 14px 24px;

    background: var(--color-black);
    color: var(--color-white);

    border: 1.5px solid var(--color-black);
    border-radius: var(--radius-full);

    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1;

    transition:
      transform 0.2s ease,
      background-color 0.2s ease,
      box-shadow 0.2s ease;
  }


  .btn-black:hover {
    background: #171717;

    transform: translateY(-2px);

    box-shadow: var(--shadow-md);
  }


  /* ----------------------------------------------------------
     Outline
     ---------------------------------------------------------- */

  .btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    padding: 13px 23px;

    background: transparent;
    color: var(--color-black);

    border: 1.5px solid var(--color-black);
    border-radius: var(--radius-full);

    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1;

    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease;
  }


  .btn-outline:hover {
    background: var(--color-black);
    color: var(--color-white);

    transform: translateY(-1px);
  }


  /* ----------------------------------------------------------
     White
     ---------------------------------------------------------- */

  .btn-white {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    padding: 14px 24px;

    background: var(--color-white);
    color: var(--color-black);

    border: 1.5px solid var(--color-white);
    border-radius: var(--radius-full);

    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1;

    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }


  .btn-white:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }


  /* ----------------------------------------------------------
     White outline
     ---------------------------------------------------------- */

  .btn-outline-white {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    padding: 13px 23px;

    background: transparent;
    color: var(--color-white);

    border: 1.5px solid var(--color-white);
    border-radius: var(--radius-full);

    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;
    line-height: 1;

    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      transform 0.2s ease;
  }


  .btn-outline-white:hover {
    background: var(--color-white);
    color: var(--color-black);

    transform: translateY(-1px);
  }


  /* ----------------------------------------------------------
     Legacy alias
     ----------------------------------------------------------
     Keep .btn-gold temporarily so existing components do not
     break. It now uses Nuvora green.
     ---------------------------------------------------------- */

  .btn-gold {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    padding: 14px 24px;

    background: var(--color-primary);
    color: var(--color-black);

    border: 1.5px solid var(--color-primary);
    border-radius: var(--radius-full);

    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;

    transition: all 0.2s ease;
  }


  .btn-gold:hover {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);

    transform: translateY(-2px);
  }
}


/* ============================================================
   6. CARD SYSTEM
   ============================================================ */

@layer components {

  .card {
    background: var(--color-white);
    color: var(--color-black);

    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-lg);

    box-shadow: var(--shadow-sm);
  }


  .card-green {
    background: var(--color-primary);
    color: var(--color-black);

    border: 1px solid var(--color-primary);
    border-radius: var(--radius-lg);
  }


  .card-dark-green {
    background: var(--color-deep-green);
    color: var(--color-white);

    border: 1px solid var(--color-deep-green);
    border-radius: var(--radius-lg);
  }


  .card-black {
    background: var(--color-black);
    color: var(--color-white);

    border: 1px solid var(--color-black);
    border-radius: var(--radius-lg);
  }


  .card-peach {
    background: var(--color-peach);
    color: var(--color-deep-green);

    border: 1px solid var(--color-peach-dark);
    border-radius: var(--radius-lg);
  }


  .card-hover {
    transition:
      transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.3s ease;
  }


  .card-hover:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-lg);
  }
}


/* ============================================================
   7. FORM SYSTEM
   ============================================================ */

@layer components {

  .input {
    width: 100%;

    padding: 14px 16px;

    background: var(--color-white);
    color: var(--color-black);

    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);

    font-family: var(--font-body);
    font-size: 0.95rem;

    outline: none;

    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }


  .input::placeholder {
    color: var(--color-text-muted);
  }


  .input:hover {
    border-color: var(--color-border-dark);
  }


  .input:focus {
    border-color: var(--color-primary-dark);

    box-shadow:
      0 0 0 3px rgba(112, 242, 80, 0.25);
  }


  .input-error {
    border-color: var(--color-error);
  }


  .input-error:focus {
    border-color: var(--color-error);

    box-shadow:
      0 0 0 3px rgba(216, 58, 58, 0.15);
  }
}


/* ============================================================
   8. BADGES / LABELS
   ============================================================ */

@layer components {

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    padding: 6px 12px;

    border-radius: var(--radius-full);

    font-family: var(--font-body);
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1;
  }


  .badge-green {
    background: var(--color-primary);
    color: var(--color-black);
  }


  .badge-dark {
    background: var(--color-deep-green);
    color: var(--color-white);
  }


  .badge-black {
    background: var(--color-black);
    color: var(--color-white);
  }


  .badge-peach {
    background: var(--color-peach-dark);
    color: var(--color-deep-green);
  }


  .tag-handwritten {
    font-family: var(--font-body);
    color: var(--color-deep-green);

    font-size: 26px;
    font-weight: 700;
  }
}


/* ============================================================
   9. DECORATIVE UTILITIES
   ============================================================ */

@layer components {

  .grid-dots {
    background-image:
      radial-gradient(circle at 15% 25%,
        rgba(255, 255, 255, 0.08) 2px,
        transparent 2px),
      radial-gradient(circle at 85% 75%,
        rgba(255, 255, 255, 0.05) 3px,
        transparent 3px);

    background-size:
      80px 80px,
      100px 100px;
  }


  .grid-dots-dark {
    background-image:
      radial-gradient(circle at 15% 25%,
        rgba(1, 57, 32, 0.08) 2px,
        transparent 2px),
      radial-gradient(circle at 85% 75%,
        rgba(1, 57, 32, 0.05) 3px,
        transparent 3px);

    background-size:
      80px 80px,
      100px 100px;
  }
}


/* ============================================================
   10. MOTION SYSTEM
   ============================================================ */

@layer utilities {

  .reveal {
    opacity: 0;

    transform: translateY(18px);

    transition:
      opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);

    will-change: opacity, transform;
  }


  .reveal-visible {
    opacity: 1;
    transform: translateY(0);
  }


  .animate-hero-in {
    animation:
      heroIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  }


  .animate-hero-in-late {
    animation:
      heroIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both;
  }


  .animate-float {
    animation: floatY 5s ease-in-out infinite;
  }


  .hover-lift {
    transition:
      transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.35s ease;
  }


  .hover-lift:hover {
    transform: translateY(-4px);
  }
}


/* ============================================================
   11. KEYFRAMES
   ============================================================ */

@keyframes heroIn {

  from {
    opacity: 0;
    transform: translateY(22px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }

}


@keyframes floatY {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-9px);
  }

}


/* ============================================================
   12. ACCESSIBILITY
   ============================================================ */

:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 3px;
}


/* ============================================================
   13. DARK MODE
   ============================================================
   
   Dark mode stays within the Nuvora brand system.
   No blue/slate palette.
   ============================================================ */

html.dark {
  color-scheme: dark;
}


html.dark body {
  background: var(--color-black);
  color: var(--color-white);
}


/* Backgrounds */

html.dark .bg-white {
  background-color: #111111;
}


html.dark .bg-\[\#FFF7E4\] {
  background-color: #0A2116;
}


/* Surfaces */

html.dark .card {
  background: #111111;
  border-color: #1F4A36;
}


html.dark .card-peach {
  background: #10281C;
  border-color: #1F4A36;
}


/* Text */

html.dark .text-ink-900 {
  color: #FFFFFF;
}


html.dark .text-ink-800 {
  color: #F3F5F4;
}


html.dark .text-ink-700 {
  color: #D7E0DB;
}


html.dark .text-ink-600 {
  color: #B1C0B8;
}


html.dark .text-ink-500 {
  color: #91A49A;
}


html.dark .text-ink-400 {
  color: #71857A;
}


/* Borders */

html.dark .border-ink-100 {
  border-color: #173B2A;
}


html.dark .border-ink-200 {
  border-color: #214C37;
}


html.dark .border-ink-300 {
  border-color: #2D6148;
}


/* Shadows */

html.dark .shadow-sm,
html.dark .shadow-md,
html.dark .shadow-lg,
html.dark .shadow-soft,
html.dark .shadow-card,
html.dark .shadow-lift {
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.45);
}


/* Legacy utility backgrounds */

html.dark .bg-ink-50 {
  background-color: #10281C;
}


html.dark .bg-ink-100 {
  background-color: #173B2A;
}


html.dark .bg-ink-200 {
  background-color: #214C37;
}


/* ============================================================
   14. REDUCED MOTION
   ============================================================ */

@media (prefers-reduced-motion: reduce) {

  html {
    scroll-behavior: auto;
  }


  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }


  .reveal,
  .animate-hero-in,
  .animate-hero-in-late,
  .animate-float {
    opacity: 1 !important;
    transform: none !important;
    animation: none !important;
    transition: none !important;
  }
}


/* ============================================================
   15. RESPONSIVE ADJUSTMENTS
   ============================================================ */

@media (min-width: 768px) {

  :root {
    --container-padding: 40px;
  }

}


@media (min-width: 1280px) {

  :root {
    --container-padding: 48px;
  }

}


@media (max-width: 767px) {

  .section {
    padding-top: 72px;
    padding-bottom: 72px;
  }


  .section-sm {
    padding-top: 48px;
    padding-bottom: 48px;
  }


  .section-lg {
    padding-top: 88px;
    padding-bottom: 88px;
  }


  .container-x {
    padding-left: 20px;
    padding-right: 20px;
  }

}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\globals.css'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/globals.css'

New-Item -ItemType Directory -Force -Path 'client\features\bookings\components' | Out-Null
$content = @'
"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, ShieldCheck, RefreshCcw } from "lucide-react";
import { qk } from "@/lib/queryClient";
import { createCohortBooking, initiatePayment } from "@/features/bookings/api/create";
import { listLearners } from "@/features/onboarding/api";
import { useSession } from "@/hooks/useSession";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Cohort } from "@/features/cohorts/api/get";
import type { BookingResponse, InitiatePaymentResponse, Order, PaymentProvider } from "@/features/bookings/types";

// Zod schema — client + server validation parity (AGENTS.md).
// G1: the paying parent is the session user (server-derived); the learner is
// picked from the parent's linked learners.
const checkoutSchema = z.object({
  student_id: z.string().uuid("Select the learner you are enrolling"),
  email: z.string().email("A valid email is required"),
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE"]),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

type Step =
  | { name: "form" }
  | { name: "creating" }
  | { name: "error"; message: string }
  | { name: "initiating" }
  | { name: "link"; booking: BookingResponse; payment: InitiatePaymentResponse };

export function CheckoutClient({ cohort }: { cohort: Cohort }) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const learners = useQuery({
    queryKey: ["onboarding", "learners"],
    queryFn: listLearners,
    enabled: !!user,
    staleTime: 30_000,
  });
  const [step, setStep] = useState<Step>({ name: "form" });
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ck-${Date.now()}`
  );

  const createBooking = useMutation({
    mutationFn: createCohortBooking,
    onSuccess: (res) => {
      // Optimistic cache write so a bookings view reflects this order immediately.
      queryClient.setQueryData<Order[]>(qk.bookings.all, (old) => [res.order, ...(old ?? [])]);
      queryClient.setQueryData(qk.orders.byNumber(res.order.order_number), res.order);
    },
  });

  const payMutation = useMutation({
    mutationFn: initiatePayment,
    onSuccess: (res) => {
      queryClient.setQueryData(qk.orders.byNumber(res.order_number), (old?: Order) =>
        old ? { ...old, status: "PENDING" as const } : old
      );
    },
  });

  const form = useForm({
    defaultValues: {
      student_id: "",
      email: "",
      provider: "PAYSTACK" as PaymentProvider,
    },
    validators: {
      onChange: ({ value }) => {
        const res = checkoutSchema.safeParse(value);
        return res.success ? undefined : (res.error.issues[0]?.message ?? "Invalid form");
      },
      onSubmit: ({ value }) => {
        const res = checkoutSchema.safeParse(value);
        return res.success ? undefined : res.error.issues.map((i) => i.message).join("; ");
      },
    },
    onSubmit: async ({ value }) => {
      setStep({ name: "creating" });
      try {
        const booking = await createBooking.mutateAsync({
          cohort_id: cohort.id,
          student_id: value.student_id,
          idempotency_key: idempotencyKey,
        });
        if (!booking.payment_required) {
          setStep({ name: "error", message: "This booking was already paid — please check your dashboard." });
          return;
        }
        setStep({ name: "initiating" });
        const payment = await payMutation.mutateAsync({
          order_id: booking.order.id,
          provider: value.provider,
          email: value.email,
        });
        setStep({ name: "link", booking, payment });
        toast.success("Order created — opening the payment page");
        if (payment.payment_link) {
          window.location.assign(payment.payment_link);
        }
      } catch (err) {
        setStep({
          name: "error",
          message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        });
      }
    },
  });

  const seatsLeft = useMemo(
    () => Math.max(0, cohort.capacity - cohort.enrolled_count),
    [cohort.capacity, cohort.enrolled_count]
  );

  if (step.name === "creating" || step.name === "initiating") {
    return (
      <div className="border rounded-2xl p-8 space-y-4" aria-busy="true">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <p className="text-sm text-ink-500 pt-2">
          {step.name === "creating" ? "Creating your secure booking order…" : "Connecting to the payment gateway…"}
        </p>
      </div>
    );
  }

  if (step.name === "link") {
    return <PaymentLinkCard order={step.booking.order} payment={step.payment} />;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card"
      noValidate
    >
      {/* Navy summary header (Tuteria payment flow) */}
      <div
        className="bg-cover bg-center px-6 py-8 text-white md:px-8"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(6,15,38,0.88), rgba(1,57,32,0.7)), url(/hero/checkout.jpg)",
        }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl tracking-[0.02em] text-white">Secure checkout</h2>
          <span className="font-display text-3xl tracking-[0.02em] text-white">
            ₦{cohort.fee.toLocaleString()}
            <span className="text-sm font-medium text-white/70"> {cohort.currency}</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-white/70">{cohort.title}</p>
      </div>

      <div className="space-y-5 p-6">
        <div className="rounded-xl bg-brand-blue-light/50 p-4 text-sm text-ink-600 space-y-1">
          <p className="font-semibold text-ink-800">{cohort.title}</p>
          <p>
            {cohort.start_date} → {cohort.end_date} · {cohort.timezone} · {cohort.location_mode}
          </p>
          <p className={seatsLeft <= 5 ? "text-amber-700 font-medium" : ""}>
            {seatsLeft > 0 ? `${seatsLeft} of ${cohort.capacity} seats left` : "Cohort full"}
          </p>
        </div>

        {/* Steps */}
        <ol className="flex items-center gap-2 text-[11px] font-bold text-ink-500">
          {["Details", "Pay", "Confirmation"].map((s2, i) => (
            <li key={s2} className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-navy text-white">
                {i + 1}
              </span>
              {s2}
              {i < 2 && <span className="h-px w-8 bg-ink-200" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <p className="text-xs text-ink-500 leading-relaxed">
          Payment is held in escrow and only released to the tutor after delivery is confirmed (or auto-released
          after 3 days). Your booking order is idempotent — retrying never double-charges.
        </p>

        <form.Field name="student_id">
          {(field) => (
            <label className="block text-sm">
              <span className="font-medium">Learner</span>
              <select
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              >
                <option value="">Select the learner to enrol…</option>
                {(learners.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.first_name} {l.last_name}
                  </option>
                ))}
              </select>
              {(learners.data ?? []).length === 0 && !learners.isLoading ? (
                <span className="mt-1 block text-xs text-ink-500">
                  No learners linked yet — <a href="/onboarding/learner" className="font-semibold text-brand-blue hover:underline">add a learner</a> first.
                </span>
              ) : null}
              {field.state.meta.errors?.length ? (
                <span className="mt-1 block text-xs text-red-600">{field.state.meta.errors.join(", ")}</span>
              ) : null}
            </label>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <label className="block text-sm">
              <span className="font-medium">Billing email</span>
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                placeholder="parent@example.com"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors?.length ? (
                <span className="mt-1 block text-xs text-red-600">{field.state.meta.errors.join(", ")}</span>
              ) : null}
            </label>
          )}
        </form.Field>

        <form.Field name="provider">
          {(field) => (
            <fieldset className="text-sm">
              <span className="font-medium">Pay with</span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(["PAYSTACK", "FLUTTERWAVE"] as PaymentProvider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => field.handleChange(p)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                      field.state.value === p
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
                    }`}
                  >
                    {p === "PAYSTACK" ? "Card · Paystack" : "Bank · Flutterwave"}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </form.Field>

        {step.name === "error" ? (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
            {step.message}
          </div>
        ) : null}

        <form.Subscribe selector={(s) => s.values}>
          {(values) => (
            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              disabled={
                createBooking.isPending ||
                payMutation.isPending ||
                !values.student_id ||
                !values.email ||
                seatsLeft === 0
              }
            >
              {createBooking.isPending || payMutation.isPending ? "Processing…" : "Pay securely now"}
            </Button>
          )}
        </form.Subscribe>

        {/* Secure badges */}
        <div className="flex items-center justify-center gap-5 border-t border-ink-100 pt-4 text-[11px] font-semibold text-ink-400">
          <span className="flex items-center gap-1.5"><Lock size={12} className="text-brand-green" /> 256-bit SSL</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-brand-green" /> Escrow protected</span>
          <span className="flex items-center gap-1.5"><RefreshCcw size={12} className="text-brand-green" /> Idempotent orders</span>
        </div>
      </div>
    </form>
  );
}

function PaymentLinkCard({ order, payment }: { order: Order; payment: InitiatePaymentResponse }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>(order.status);
  const [checked, setChecked] = useState(0);

  // Poll the order until it leaves PENDING (webhook round-trip → PAID/CANCELLED).
  useEffect(() => {
    if (status !== "PENDING") return;
    const t = setInterval(async () => {
      try {
        const res = await apiFetch<Order>(`/me/orders/${order.id}`);
        setStatus(res.data.status);
        setChecked((c) => c + 1);
      } catch {
        /* network hiccup — keep polling */
      }
    }, 6000);
    return () => clearInterval(t);
  }, [status, order.id]);

  const paid = status === "PAID" || status === "COMPLETED";
  const stillPending = status === "PENDING";
  return (
    <div className="border rounded-2xl p-8 text-center space-y-4" data-testid="payment-link-card">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-brand-green">
        <ShieldCheck size={26} />
      </div>
      <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy">Order {order.order_number} — ready to pay</h2>
      <p className="text-sm text-ink-600">
        {payment.amount.toLocaleString()} {payment.currency} via{" "}
        {payment.provider === "PAYSTACK" ? "Paystack" : "Flutterwave"}.
        <br />
        Funds are held in escrow until your lessons are delivered.
      </p>
      {paid ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          ✅ Payment confirmed — your seat is secured! View it in your dashboard.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="gold"
            size="lg"
            onClick={() => {
              window.location.href = payment.payment_link;
            }}
          >
            Continue to payment gateway
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              void navigator.clipboard?.writeText(payment.payment_link);
              setCopied(true);
            }}
          >
            {copied ? "Copied ✓" : "Copy payment link"}
          </Button>
        </div>
      )}
      {stillPending && (
        <p className="text-xs text-ink-400">
          Waiting for payment confirmation… {checked > 0 ? `(checked ${checked}×)` : "this page refreshes automatically"}
        </p>
      )}
      <p className="text-xs text-ink-400">
        Order reference: <span className="font-mono">{payment.provider_reference}</span>
      </p>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\features\bookings\components\CheckoutClient.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/features/bookings/components/CheckoutClient.tsx'

New-Item -ItemType Directory -Force -Path 'client\features\subjects\components' | Out-Null
$content = @'
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { listSubjects } from "@/features/subjects/api/list";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = ["All", "Academic", "Digital", "Languages", "Nigerian Languages", "Music", "Exam Preparation"];

const FALLBACK_SUBJECTS = [
  { id: "1", slug: "mathematics", name: "Mathematics", category: "Academic", description: "Core maths across British and Nigerian pathways." },
  { id: "2", slug: "english", name: "English Language", category: "Academic", description: "Comprehension, writing and oral." },
  { id: "3", slug: "physics", name: "Physics", category: "Academic", description: "Mechanics, waves, electricity." },
  { id: "4", slug: "chemistry", name: "Chemistry", category: "Academic", description: "Organic, inorganic and practicals." },
  { id: "5", slug: "biology", name: "Biology", category: "Academic", description: "Life sciences for SSS and IGCSE." },
  { id: "6", slug: "further-maths", name: "Further Mathematics", category: "Academic", description: "For A-Level and strong SSS candidates." },
  { id: "7", slug: "economics", name: "Economics", category: "Academic", description: "Micro, macro and exam technique." },
  { id: "8", slug: "accounting", name: "Accounting", category: "Academic", description: "Bookkeeping and financial statements." },
  { id: "9", slug: "computer-science", name: "Computer Science", category: "Digital", description: "Theory and programming for IGCSE/SSS." },
  { id: "10", slug: "/digital-skills", name: "Python Programming", category: "Digital", description: "First programs to small projects." },
  { id: "11", slug: "/digital-skills", name: "ICT & Digital Literacy", category: "Digital", description: "Practical computing for school and work." },
  { id: "12", slug: "/digital-skills", name: "Cybersecurity", category: "Digital", description: "Safe online habits and fundamentals." },
  { id: "13", slug: "french", name: "French", category: "Languages", description: "Beginner to exam oral practice." },
  { id: "14", slug: "yoruba", name: "Yoruba", category: "Nigerian Languages", description: "Language and literature support." },
  { id: "15", slug: "igbo", name: "Igbo", category: "Nigerian Languages", description: "Language and literature support." },
  { id: "16", slug: "hausa", name: "Hausa", category: "Nigerian Languages", description: "Language and literature support." },
  { id: "17", slug: "music", name: "Music", category: "Music", description: "Theory and practical coaching." },
  { id: "18", slug: "/exam-prep", name: "WAEC / NECO prep", category: "Exam Preparation", description: "Past papers and mocks." },
  { id: "19", slug: "/utme-2026", name: "UTME / JAMB", category: "Exam Preparation", description: "Topic drills and CBT-style mocks." },
  { id: "20", slug: "/gmat", name: "GMAT / GRE", category: "Exam Preparation", description: "Diagnostic-led graduate test prep." },
].map((s, i) => ({
  ...s,
  photo: ["/hero/subjects.jpg", "/hero/exam-prep.jpg", "/hero/british.jpg", "/hero/nigerian.jpg", "/hero/digital.jpg"][i % 5],
}));

export function SubjectsClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(sp.get("q") ?? "");
  const [category, setCategory] = useState(sp.get("category") ?? "All");

  const subjects = useQuery({
    queryKey: ["subjects", "list", search, category],
    queryFn: () =>
      listSubjects({
        search: search || undefined,
        category: category === "All" ? undefined : category,
        page: 1,
      }),
    staleTime: 180_000,
  });

  const selectCategory = (c: string) => {
    setCategory(c);
    const qs = new URLSearchParams();
    if (c !== "All") qs.set("category", c);
    if (search) qs.set("q", search);
    router.push(`/subjects?${qs.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const qs = new URLSearchParams();
              if (search) qs.set("q", search);
              if (category !== "All") qs.set("category", category);
              router.push(`/subjects?${qs.toString()}`, { scroll: false });
            }
          }}
          placeholder="Search subjects…"
          className="flex-1 max-w-sm rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => selectCategory(c)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                category === c ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {subjects.isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : subjects.isError ? (
        <div className="border rounded-2xl p-10 text-center text-red-600">Could not load subjects.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(
            (subjects.data?.data ?? []).length > 0
              ? subjects.data!.data
              : FALLBACK_SUBJECTS.filter((s) => {
                  if (category !== "All" && s.category !== category) return false;
                  if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
                  return true;
                })
          ).map((s) => (
            <Link
              key={s.id}
              href={s.slug.startsWith("/") ? s.slug : `/subjects/${s.slug}`}
              className="overflow-hidden rounded-2xl border border-ink-100 bg-cover bg-center p-5 text-white shadow-soft"
              style={{
                backgroundImage: `linear-gradient(165deg, rgba(6,15,38,0.82), rgba(1,57,32,0.55)), url(${s.photo ?? "/hero/subjects.jpg"})`,
              }}
            >
              <h3 className="font-bold text-white">{s.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-white/70">{s.category}</p>
              {s.description && <p className="mt-2 line-clamp-2 text-sm text-white/80">{s.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\features\subjects\components\SubjectsClient.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/features/subjects/components/SubjectsClient.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\help' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, LifeBuoy, ArrowRight, ChevronDown } from "lucide-react";
import { HELP_CATEGORIES, slugify } from "@/lib/help-data";
import { PageHero } from "@/components/layout/PageHero";

// Help Center — searchable, categorised FAQ hub (single source of truth is
// lib/help-data.ts). Client-side search across every question + answer.

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return null;
    const hits: { category: string; faq: { q: string; a: string } }[] = [];
    for (const cat of HELP_CATEGORIES) {
      for (const faq of cat.faqs) {
        if (faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)) {
          hits.push({ category: cat.title, faq });
        }
      }
    }
    return hits;
  }, [q]);

  return (
    <main>
      
      <PageHero
        eyebrow="Help Center"
        title="How can we help?"
        subtitle="Search for an answer, or browse by topic. If you can't find it, our team is one message away."
        align="center"
      />

      <div className="container-x py-12">

      {/* Search */}
      <div className="mx-auto -mt-8 max-w-xl">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, e.g. escrow, refunds, vetting…"
            aria-label="Search help articles"
            className="w-full rounded-full border border-ink-200 bg-white py-4 pl-12 pr-5 text-sm shadow-card focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
          />
        </div>
      </div>

      {/* Search results */}
      {results && (
        <section className="mx-auto mt-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query.trim()}&rdquo;
          </p>
          <div className="mt-4 space-y-3">
            {results.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
                <p className="text-sm text-ink-600">No matching articles. Try a different term, or contact us below.</p>
              </div>
            )}
            {results.map((r) => (
              <div key={r.faq.q} className="rounded-2xl border border-ink-100 bg-white p-5">
                <Link
                  href={`/help/${slugify(r.faq.q)}`}
                  className="font-semibold text-brand-navy transition-colors hover:text-brand-blue"
                >
                  {r.faq.q}
                </Link>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{r.faq.a}</p>
                <Link
                  href={`/help/${slugify(r.faq.q)}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline"
                >
                  Read article <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {!results && (
        <section className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          {HELP_CATEGORIES.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">{cat.title}</h2>
              <p className="mt-1 text-sm text-ink-500">{cat.blurb}</p>
              <div className="mt-4 space-y-2">
                {cat.faqs.map((f) => (
                  <details
                    key={f.q}
                    open={open === f.q}
                    onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open ? f.q : null)}
                    className="rounded-xl border border-ink-100 px-4 py-3"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-ink-800 [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <ChevronDown size={15} className={`shrink-0 text-ink-400 transition-transform ${open === f.q ? "rotate-180" : ""}`} />
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.a}</p>
                    <Link
                      href={`/help/${slugify(f.q)}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
                    >
                      Read article <ArrowRight size={12} />
                    </Link>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Contact CTA */}
      <section className="mx-auto mt-14 max-w-3xl rounded-3xl bg-brand-navy p-10 text-center text-white">
        <LifeBuoy size={28} className="mx-auto text-brand-gold" />
        <h2 className="mt-4 font-display text-2xl tracking-[0.02em] text-white">Still need help?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
          Our support team usually replies within one working day.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover hover:-translate-y-0.5"
        >
          Contact support <ArrowRight size={15} />
        </Link>
      </section>
    
      </div>
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\help\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/help/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\help\[slug]' | Out-Null
$content = @'
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, LifeBuoy } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InnerHero } from "@/components/layout/InnerHero";
import { buildMetadata } from "@/lib/seo";
import { getHelpArticle, getHelpArticles } from "@/lib/help-data";

// Help article pages — one indexable URL per FAQ (from lib/help-data.ts, the
// single source of truth). Content is the same factual answers as /help, so the
// two never drift.

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getHelpArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const article = getHelpArticle(slug);
  if (!article) {
    return buildMetadata({
      title: "Help article not found | NUVORA",
      description: "This help article could not be found.",
      path: `/help/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${article.q} | NUVORA Help`,
    description: article.a.length > 150 ? `${article.a.slice(0, 147)}…` : article.a,
    path: `/help/${article.slug}`,
  });
}

export default async function HelpArticlePage(props: Props) {
  const { slug } = await props.params;
  const article = getHelpArticle(slug);
  if (!article) return notFound();

  const related = getHelpArticles().filter(
    (a) => a.category.id === article.category.id && a.slug !== article.slug
  );

  return (
    <main className="container-x pb-16">
      <InnerHero>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Help Center", href: "/help" },
            { name: article.q },
          ]}
        />
        <div className="text-xs font-semibold uppercase text-brand-blue">{article.category.title}</div>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight md:text-4xl">{article.q}</h1>
      </InnerHero>

      <article className="mx-auto mt-8 max-w-3xl">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft md:p-8">
          <p className="leading-relaxed text-ink-700">{article.a}</p>
        </div>
        <Link
          href="/help"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"
        >
          <ArrowLeft size={15} /> Back to Help Center
        </Link>
      </article>

      {related.length > 0 && (
        <section className="mx-auto mt-12 max-w-3xl">
          <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">Related questions</h2>
          <ul className="mt-4 divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/help/${r.slug}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-ink-800 transition-colors hover:text-brand-blue"
                >
                  <span>{r.q}</span>
                  <ArrowRight size={15} className="shrink-0 text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto mt-14 max-w-3xl rounded-3xl bg-brand-navy p-10 text-center text-white">
        <LifeBuoy size={28} className="mx-auto text-brand-gold" />
        <h2 className="mt-4 font-display text-2xl tracking-[0.02em] text-white">Still need help?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
          Our support team usually replies within one working day.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-brand-gold-hover"
        >
          Contact support <ArrowRight size={15} />
        </Link>
      </section>
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\help\[slug]\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/help/[slug]/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\(marketing)\about' | Out-Null
$content = @'
import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { buildMetadata, personJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import Link from "next/link";
import { GraduationCap, BookOpen, Eye, ShieldCheck, Check, Award, Briefcase } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "About — Academic Leadership, Standards & Safeguarding | NUVORA",
  description:
    "NUVORA combines excellent teachers, strong academic systems and technology to give learners structured, high-quality education anywhere. Meet our academic leader.",
  path: "/about",
});

const FOUNDER = {
  name: "Yinka Oladimeji",
  role: "Founder & Academic Leader",
  summary:
    "Experienced educator, Computing leader and IT professional — a career spanning leading international schools in Nigeria.",
  career: [
    "Atlantic Hall Educational Trust Council",
    "Day Waterman College",
    "Children's International School, Lekki — Head of Computing",
  ],
  credentials: ["BSc Computer Science", "MSc Information Technology", "Fellow, COBIS Middle Leaders"],
  achievements: [
    "Prepared learners for IGCSE Computer Science with exceptional national outcomes.",
    "Led a delegation at the 2026 International Coding Olympiad (Rome) — medals, and a Nigerian student world Top-3 in Codementum.",
  ],
};

const PILLARS = [
  {
    icon: GraduationCap,
    title: "Academically governed",
    body: "Every tutor is vetted and every programme follows a defined curriculum pathway.",
  },
  {
    icon: BookOpen,
    title: "Multi-curriculum",
    body: "British and Nigerian pathways in one platform — Year 7 to IGCSE, WAEC, NECO, JAMB and A-Level.",
  },
  {
    icon: Eye,
    title: "Parent visibility",
    body: "Attendance, progress, feedback and payments — one parent dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Safeguarding by design",
    body: "Restricted messaging, governed lesson access and careful handling of learner data.",
  },
];

const QUALITY = [
  "Staged vetting: identity, documents, interview, competency assessment",
  "Curriculum-governed programmes with defined outcomes",
  "Lesson notes, attendance and homework after every session",
  "Weekly progress reports with strengths and recommendations",
];

const SAFEGUARDING = [
  "Minors are created and linked by parents or guardians",
  "Learner contact details are never exposed to tutors unnecessarily",
  "Messaging is booking-scoped — no direct contact between strangers",
  "A clear reporting path for safeguarding concerns",
];

export default function AboutPage() {
  const person = personJsonLd({
    name: FOUNDER.name,
    description: FOUNDER.summary,
    url: "https://nuvora.com/about",
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "About", item: "https://nuvora.com/about" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />

      
      <PageHero
        cover="/hero/about.jpg"
        eyebrow="Who we are"
        title="A school without walls"
        subtitle="An online school, not a tutor directory — programmes, cohorts and vetted tutors with progress you can actually see."
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }]}
        align="center"
      />

      <div className="container-x py-12">

      {/* Vision */}
      <section className="mt-12 rounded-3xl bg-[#70F250] px-8 py-10 text-center md:px-14">
        <h2 className="font-display text-2xl tracking-[0.02em] text-black md:text-3xl">Our vision</h2>
        <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-black/80">
          High-quality, accountable teaching beyond geography — for every learner, wherever they are.
        </p>
      </section>

      {/* Pillars */}
      <section className="mt-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Why NUVORA</p>
        <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">What makes us different</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-colors hover:border-brand-gold">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                <p.icon size={20} />
              </span>
              <div>
                <h3 className="font-display text-lg tracking-[0.02em] text-brand-navy">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Founder — compact card */}
      <section className="mt-14 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft">
        <div className="grid items-stretch lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col items-center justify-center gap-3 bg-brand-navy p-8 text-center text-white">
            <div className="grid size-20 place-items-center rounded-full bg-brand-gold font-display text-3xl text-ink-900">
              {FOUNDER.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <p className="text-lg font-bold">{FOUNDER.name}</p>
              <p className="text-sm text-brand-gold">{FOUNDER.role}</p>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Academic leadership</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">{FOUNDER.summary}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Briefcase size={14} className="text-brand-green" />
              {FOUNDER.career.map((c) => (
                <span key={c} className="rounded-full bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-700">
                  {c}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Award size={14} className="text-brand-green" />
              {FOUNDER.credentials.map((c) => (
                <span key={c} className="rounded-full bg-brand-gold-light px-3 py-1.5 text-xs font-semibold text-brand-navy">
                  {c}
                </span>
              ))}
            </div>

            <ul className="mt-5 space-y-2">
              {FOUNDER.achievements.map((a) => (
                <li key={a} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <Check size={15} strokeWidth={3} className="mt-0.5 shrink-0 text-brand-green" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Quality + safeguarding */}
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {[
          { title: "Our academic quality model", items: QUALITY },
          { title: "Safeguarding & learner wellbeing", items: SAFEGUARDING },
        ].map((s) => (
          <div key={s.title} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">{s.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {s.items.map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-gold-light text-brand-green">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-700">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-3xl bg-brand-navy p-10 text-center text-white md:p-12">
        <h2 className="font-display text-2xl tracking-[0.02em] text-white md:text-3xl">Explore what NUVORA offers</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">
          British or Nigerian curriculum, exam preparation or digital skills.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/programmes" className="rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover hover:-translate-y-0.5">
            Find a programme
          </Link>
          <Link href="/private-tuition" className="rounded-full border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
            Book private tuition
          </Link>
        </div>
      </section>
    
      </div>
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\(marketing)\about\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/(marketing)/about/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\(marketing)\careers' | Out-Null
$content = @'
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import {
  ShieldCheck,
  GraduationCap,
  Lock,
  Code2,
  Users,
  Briefcase,
  Check,
  Send,
} from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Careers — Join the team building NUVORA",
  description:
    "We're building Africa's trusted virtual school — engineering, academic operations and tutor success. See open roles and how we hire.",
  path: "/careers",
});

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Safeguarding first",
    body: "We serve children, so safety is a product requirement — restricted messaging, governed lesson access and careful handling of learner data.",
  },
  {
    icon: GraduationCap,
    title: "Academic standards",
    body: "Every feature has to earn its place in a real learning journey: vetted tutors, curriculum-governed programmes and progress you can see.",
  },
  {
    icon: Lock,
    title: "Honest money",
    body: "Payments are escrow-protected and fail closed. Funds move only when they should — safety is built in, not bolted on.",
  },
  {
    icon: Code2,
    title: "Small team, real ownership",
    body: "We ship across the whole system — a Next.js client, a Go API, PostgreSQL and Redis — and everyone owns their work end to end.",
  },
];

const WORK = [
  "The web client: Next.js + TypeScript with TanStack Query, route groups and a branded design system",
  "The Go API: REST + OpenAPI contract, PostgreSQL, Redis caching and a background job worker",
  "Payments & bookings: escrow-safe tuition payments, cohorts and private lessons, tutor payouts",
  "Trust & safety: tutor vetting, safeguarding rules, role-based access and audit logging",
];

const ROLES = [
  {
    icon: Code2,
    title: "Full-Stack Engineer (Next.js + Go)",
    body: "Build across the web client and the Go API — dashboards, bookings, escrow payments and the tutor experience. Comfortable with TypeScript and Go, and you care about shipping working systems.",
    tags: ["Next.js", "Go", "PostgreSQL", "Redis"],
  },
  {
    icon: Users,
    title: "Academic Operations Lead",
    body: "Own programme quality and academic governance — tutor vetting and interviews, curriculum pathways, safeguarding and the learner experience. An educator who can run operations, not just teach.",
    tags: ["Vetting", "Safeguarding", "Programmes", "Quality"],
  },
];

const PROCESS = [
  { step: "01", title: "Apply", body: "Write to us with a short note and, for engineering roles, links to work you are proud of." },
  { step: "02", title: "Intro call", body: "A conversation about the role, the team and what you would like to build." },
  { step: "03", title: "Work sample", body: "A focused, take-home exercise or technical conversation — no all-day interviews." },
  { step: "04", title: "Meet the team & offer", body: "Meet the people you would work with, then a clear decision either way." },
];

export default function CareersPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Careers", item: "https://nuvora.com/careers" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      
      <PageHero
        eyebrow="Join the team"
        title="Build the school of the future"
        subtitle="NUVORA is a full commercial, SEO-first virtual school — not just a lead-gen site. We hire people who want to build real education infrastructure: engineering, academic operations and tutor success."
        crumbs={[{ name: "Home", href: "/" }, { name: "Careers" }]}
        align="center"
      />

      <div className="container-x py-12">

      {/* Mission */}
      <section className="mt-14 rounded-3xl bg-[#70F250] p-10 text-center md:p-14">
        <h2 className="font-display text-2xl tracking-[0.02em] text-black md:text-3xl">Why work with us</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-black/80">
          We are building a complete virtual school: programmes, cohorts, vetted tutors, assessments
          and progress parents can actually see. Every role here shapes that product directly.
        </p>
      </section>

      {/* Values */}
      <section className="mt-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">How we work</p>
        <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">What we value</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft transition-colors hover:border-brand-gold"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                <v.icon size={20} />
              </span>
              <h3 className="mt-4 font-display text-lg tracking-[0.02em] text-brand-navy">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you'll work on + hiring process */}
      <section className="mt-16 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">What you will work on</h2>
          <ul className="mt-4 space-y-3">
            {WORK.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-gold-light text-brand-green">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="text-sm leading-relaxed text-ink-700">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">Hiring process</h2>
          <ol className="mt-4 space-y-4">
            {PROCESS.map((p) => (
              <li key={p.step} className="flex gap-4">
                <span className="font-display text-xl text-brand-gold">{p.step}</span>
                <div>
                  <p className="font-bold text-brand-navy">{p.title}</p>
                  <p className="text-sm leading-relaxed text-ink-600">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Open roles */}
      <section className="mt-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Open roles</p>
        <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">Join the team</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {ROLES.map((r) => (
            <div
              key={r.title}
              className="flex flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-soft transition-colors hover:border-brand-gold"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                <r.icon size={20} />
              </span>
              <h3 className="mt-4 font-display text-lg tracking-[0.02em] text-brand-navy">{r.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{r.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.tags.map((t) => (
                  <span key={t} className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">
                    {t}
                  </span>
                ))}
              </div>
              <a
                href={`mailto:support@nuvora.com?subject=${encodeURIComponent(`Application — ${r.title}`)}`}
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-brand-gold px-5 py-2.5 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover"
              >
                Apply <Send size={14} />
              </a>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-5">
          <Briefcase className="mt-0.5 size-5 shrink-0 text-brand-green" />
          <p className="text-sm leading-relaxed text-ink-700">
            <span className="font-bold text-brand-navy">Don&apos;t see your role?</span> We review speculative
            applications from strong people. Write to{" "}
            <a
              href="mailto:support@nuvora.com?subject=Careers%20%E2%80%94%20speculative%20application"
              className="font-semibold text-brand-blue hover:underline"
            >
              support@nuvora.com
            </a>{" "}
            with a short note about what you would like to build.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 rounded-3xl bg-brand-navy p-12 text-center text-white">
        <h2 className="font-display text-2xl tracking-[0.02em] text-white md:text-3xl">Build with us</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">
          Tell us what you would bring to NUVORA. We read every application.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            href="mailto:support@nuvora.com?subject=Careers%20application"
            className="rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-brand-gold-hover"
          >
            Apply now
          </a>
          <Link
            href="/about"
            className="rounded-full border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Learn about us
          </Link>
        </div>
      </section>
    
      </div>
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\(marketing)\careers\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/(marketing)/careers/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\(marketing)\digital-skills' | Out-Null
$content = @'
import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { CohortStrip } from "@/features/cohorts/components/CohortStrip";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Computing & Digital Skills — CS, Python, AI, Cybersecurity | NUVORA",
  description:
    "Computer Science, ICT, Python, AI, Cybersecurity and Microsoft Office — cohorts and private tuition.",
  path: "/digital-skills",
});

const TRACKS = [
  { title: "Computer Science", desc: "IGCSE/SSS Computer Science with programming and theory.", href: "/programmes", photo: "/hero/digital.jpg" },
  { title: "ICT & Digital Literacy", desc: "Practical computing for school and the workplace.", href: "/programmes", photo: "/hero/subjects.jpg" },
  { title: "Python Programming", desc: "From first programs to real projects.", href: "/programmes", photo: "/hero/test-prep.jpg" },
  { title: "Artificial Intelligence", desc: "Concepts, tools and responsible AI use for students.", href: "/programmes", photo: "/hero/programmes.jpg" },
  { title: "Cybersecurity", desc: "Safe online habits and security fundamentals.", href: "/programmes", photo: "/hero/how-it-works.jpg" },
  { title: "Microsoft Office", desc: "Word, Excel, PowerPoint and certification prep.", href: "/programmes", photo: "/hero/checkout.jpg" },
];

export default function DigitalSkillsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Digital Skills", item: "https://nuvora.com/digital-skills" },
  ]);
  const course = courseJsonLd({
    name: "Computing & Digital Skills Academy",
    description: "Computer Science, ICT, Python, AI, Cybersecurity and Microsoft Office.",
    provider: "NUVORA",
    url: "https://nuvora.com/digital-skills",
  });

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <PageHero
        cover="/hero/digital.jpg"
        eyebrow="The digital academy"
        title="Computing & Digital Skills"
        subtitle="Computer Science, programming, AI and digital safety — taught as structured cohorts or one-to-one."
        crumbs={[{ name: "Home", href: "/" }, { name: "Digital Skills" }]}
        image={{ src: "/hero/test-prep.jpg", alt: "Student learning to code" }}
        ctas={[
          { label: "Browse programmes", href: "/programmes", primary: true },
          { label: "Book a coding tutor", href: "/private-tuition" },
        ]}
      />

      <div className="container-x pt-14 pb-16">
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TRACKS.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="overflow-hidden rounded-2xl border border-ink-100 bg-cover bg-center p-6 text-white shadow-card transition hover:-translate-y-0.5"
              style={{
                backgroundImage:
                  "linear-gradient(165deg, rgba(6,15,38,0.9), rgba(1,57,32,0.7)), url(/hero/test-prep.jpg)",
              }}
            >
              <h2 className="font-bold text-white">{t.title}</h2>
              <p className="mt-2 text-sm text-white/80">{t.desc}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand-gold">Explore →</span>
            </Link>
          ))}
        </section>

        <section className="mt-14 rounded-3xl bg-[#12121e] p-8 text-white md:grid md:grid-cols-2 md:items-center md:gap-8 md:p-12">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Competition coaching</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Optional coaching for coding contests — mock rounds and strategy. Ask us what we currently run.
            </p>
          </div>
          <div className="mt-6 md:mt-0 md:text-right">
            <Link href="/contact" className="inline-flex rounded-xl bg-brand-gold px-6 py-3.5 text-sm font-bold text-ink-800">
              Ask about competition coaching
            </Link>
          </div>
        </section>
        <CohortStrip />
      </div>
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\(marketing)\digital-skills\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/(marketing)/digital-skills/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\(marketing)\exam-prep\[exam]\[subject]' | Out-Null
$content = @'
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Check, GraduationCap, Target } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InnerHero } from "@/components/layout/InnerHero";
import { buildMetadata } from "@/lib/seo";
import { getExam, getExamPrepPages, getSubject, type ExamSubject } from "@/lib/exam-prep-data";

// Exam-prep subject pages — one indexable URL per exam × subject (from
// lib/exam-prep-data.ts). Factual paper structure + board-agnostic syllabus
// themes, with links back to the live subject catalogue.

type Props = { params: Promise<{ exam: string; subject: string }> };

export function generateStaticParams() {
  return getExamPrepPages();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { exam, subject } = await props.params;
  const examInfo = getExam(exam);
  const subjectInfo = getSubject(subject);
  if (!examInfo || !subjectInfo) {
    return buildMetadata({
      title: "Not found | NUVORA",
      description: "This exam subject page could not be found.",
      path: `/exam-prep/${exam}/${subject}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${subjectInfo.name} ${examInfo.code} Preparation | NUVORA`,
    description: `${examInfo.name}: ${subjectInfo.overview}`,
    path: `/exam-prep/${examInfo.slug}/${subjectInfo.slug}`,
  });
}

export default async function ExamPrepSubjectPage(props: Props) {
  const { exam: examSlug, subject: subjectSlug } = await props.params;
  const exam = getExam(examSlug);
  const subject = getSubject(subjectSlug);
  if (!exam || !subject || !exam.subjects.includes(subject.slug)) return notFound();

  const related = exam.subjects
    .filter((s) => s !== subject.slug)
    .map((s) => getSubject(s))
    .filter((s): s is ExamSubject => Boolean(s));

  return (
    <main className="container-x pb-16">
      <InnerHero>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Exam Preparation", href: "/exam-prep" },
            { name: `${subject.name} — ${exam.code}` },
          ]}
        />
        <div className="text-xs font-semibold uppercase text-brand-blue">{exam.name}</div>
        <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight md:text-4xl">
          {subject.name} — {exam.code} Preparation
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-600">{exam.fullName}</p>
      </InnerHero>

      <div className="mx-auto mt-8 grid max-w-5xl items-start gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-6">
          {/* Paper structure */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-brand-navy">
              <BookOpen size={18} className="text-brand-green" /> About this paper
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              {exam.level} · {exam.format}
            </p>
            <ul className="mt-4 space-y-3">
              {exam.structure.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-gold-light text-brand-green">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-700">{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-700">{exam.grading}</p>
          </section>

          {/* What the subject covers */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-brand-navy">
              <BookOpen size={18} className="text-brand-green" /> What {subject.name} covers
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{subject.overview}</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {subject.topics.map((topic) => (
                <li key={topic} className="flex items-start gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-green" />
                  {topic}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28">
          {/* Skills */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-brand-navy">
              <Target size={18} className="text-brand-green" /> Skills the paper rewards
            </h2>
            <ul className="mt-4 space-y-3">
              {subject.skills.map((skill) => (
                <li key={skill} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-gold-light text-brand-green">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-700">{skill}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* How NUVORA prepares you */}
          <section className="rounded-2xl bg-brand-navy p-6 text-white">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-white">
              <GraduationCap size={18} className="text-brand-gold" /> How NUVORA prepares you
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/85">
              <li>· Vetted subject specialists matched to your syllabus</li>
              <li>· Past-paper practice mapped to each topic</li>
              <li>· Timed mocks with feedback and a predicted-grade view</li>
              <li>· Weekly progress reports for parents</li>
            </ul>
            <div className="mt-5 space-y-2.5">
              <Link
                href="/programmes"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-gold px-5 py-3 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover"
              >
                Join a revision cohort <ArrowRight size={15} />
              </Link>
              <Link
                href={`/subjects/${subject.catalogueSlug}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Explore {subject.name} tutors
              </Link>
            </div>
          </section>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-12 max-w-5xl">
          <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
            Other {exam.code} subjects
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/exam-prep/${exam.slug}/${r.slug}`}
                className="rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-gold hover:text-brand-blue"
              >
                {r.name}
              </Link>
            ))}
          </div>
          <Link
            href="/exam-prep"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"
          >
            <ArrowRight size={15} /> Back to Exam Preparation
          </Link>
        </section>
      )}
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\(marketing)\exam-prep\[exam]\[subject]\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/(marketing)/exam-prep/[exam]/[subject]/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\student-dashboard' | Out-Null
$content = @'
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  listMyAssignments,
  listMySubmissions,
  submitAssignment,
  getAttendanceSummary,
} from "@/features/portal/api";
import { StudentQuizzes } from "@/features/learning/StudentQuizzes";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { RecommendationsForYou } from "@/components/dashboard/RecommendationsForYou";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { LineChart, FileText, CheckCircle2 } from "lucide-react";

// Student portal (working-doc §9): side nav, Today panel, progress,
// assignments with submission, resources, announcements, support.

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  status: string;
};

type Cohort = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
};

const SECTIONS = ["Overview", "My Classes", "Calendar", "Assignments", "Quizzes", "Progress"] as const;
type Section = (typeof SECTIONS)[number];

export default function StudentDashboardPage() {
  const qc = useQueryClient();
  // G1: the learner profile resolves from the session server-side.
  const { user } = useSession();
  const [section, setSection] = useState<Section>("Overview");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const lessons = useQuery({
    queryKey: ["student", "lessons"],
    queryFn: async () => {
      const res = await apiFetch<Lesson[]>("/me/lessons");
      return res.data ?? [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const assignments = useQuery({
    queryKey: ["student", "assignments"],
    queryFn: () => listMyAssignments(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const submissions = useQuery({
    queryKey: ["student", "submissions"],
    queryFn: () => listMySubmissions(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const attendance = useQuery({
    queryKey: ["student", "attendance"],
    queryFn: () => getAttendanceSummary(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const submit = useMutation({
    mutationFn: ({ assignmentId, content }: { assignmentId: string; content: string }) =>
      submitAssignment(undefined, assignmentId, content),
    onSuccess: () => {
      toast.success("Assignment submitted!");
      qc.invalidateQueries({ queryKey: ["student", "assignments"] });
      qc.invalidateQueries({ queryKey: ["student", "submissions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit"),
  });

  const upcoming = (lessons.data ?? []).filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING");
  const past = (lessons.data ?? []).filter((l) => l.status === "COMPLETED" || l.status === "NO_SHOW");
  const submittedIds = new Set((submissions.data ?? []).map((s) => s.assignment_id));

  return (
    <main className="px-4 py-8 md:px-8">
      <RoleGate page="/student-dashboard" />
      <RecommendationsForYou />
      <PageHeader
        eyebrow="Student portal"
        title="Student dashboard"
        subline="Your classes, assignments and progress — in one place."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              section === s ? "bg-brand-gold text-ink-900" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <div>
          {section === "Overview" && (
            <div className="space-y-6">
              {/* KPI snapshot */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Attendance" value={attendance.data ? `${attendance.data.rate.toFixed(0)}%` : "–"} hint={`${attendance.data?.present ?? 0} present of ${attendance.data?.total ?? 0}`} icon={<LineChart size={18} />} />
                <StatCard label="Assignments" value={`${submittedIds.size}/${assignments.data?.length ?? 0}`} hint="submitted" icon={<FileText size={18} />} />
                <StatCard label="Lessons completed" value={past.length} hint="all time" icon={<CheckCircle2 size={18} />} />
              </div>

              {/* Today */}
              <section className="rounded-2xl bg-brand-blue text-white p-6">
                <h2 className="font-bold text-white">Today&apos;s lessons</h2>
                {lessons.isLoading ? (
                  <Skeleton className="h-12 w-full mt-3 bg-white/20" />
                ) : upcoming.length === 0 ? (
                  <p className="mt-3 text-sm text-white/80">No lessons scheduled for today.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {upcoming.slice(0, 4).map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/10 px-5 py-3">
                        <div>
                          <div className="font-semibold">{l.title}</div>
                          <div className="text-xs text-white/70">
                            {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                          </div>
                        </div>
                        {l.meeting_url ? (
                          <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-white text-brand-blue font-bold text-sm px-5 py-2.5">
                            Join class
                          </a>
                        ) : (
                          <span className="text-xs text-white/60">Link opens at lesson time</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Recent tutor feedback / notes */}
              <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                <h2 className="font-bold">Recent lessons & feedback</h2>
                {past.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-500">No completed lessons yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-ink-100">
                    {past.slice(0, 5).map((l) => (
                      <li key={l.id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-semibold">{l.title}</div>
                          <div className="text-xs text-ink-500">{new Date(l.start_at).toLocaleDateString()}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-ink-100 text-ink-500">{l.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {section === "My Classes" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">My classes</h2>
              <p className="text-xs text-ink-500 mt-1">Your cohort lessons — join links appear within the lesson window.</p>
              {lessons.isLoading ? (
                <Skeleton className="h-20 w-full mt-3" />
              ) : (lessons.data?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-ink-500 border border-dashed border-ink-200 rounded-xl p-8 text-center">
                  No lessons yet — join a cohort to get started.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {(lessons.data ?? []).slice(0, 20).map((l) => (
                    <li key={l.id} className="border rounded-xl p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">{l.title}</div>
                        <div className="text-xs text-ink-500">
                          {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                        </div>
                      </div>
                      {l.meeting_url ? (
                        <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue text-white text-sm font-bold px-4 py-2">Join</a>
                      ) : (
                        <span className="text-xs text-ink-400">{l.status}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {section === "Calendar" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Calendar</h2>
              <p className="text-xs text-ink-500 mt-1">All times in your lesson timezone — clearly shown for cross-country learners.</p>
              {lessons.isLoading ? (
                <Skeleton className="h-20 w-full mt-3" />
              ) : (lessons.data?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-ink-500">Nothing scheduled yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {groupByDate(lessons.data ?? []).map(([date, items]) => (
                    <div key={date}>
                      <h3 className="text-sm font-bold text-brand-blue">{date}</h3>
                      <ul className="mt-2 space-y-2">
                        {items.map((l) => (
                          <li key={l.id} className="border rounded-xl px-4 py-3 text-sm flex justify-between">
                            <span className="font-semibold">{l.title}</span>
                            <span className="text-xs text-ink-500">{new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {l.timezone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {section === "Assignments" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Assignments</h2>
              {assignments.isLoading ? (
                <Skeleton className="h-20 w-full mt-3" />
              ) : (assignments.data?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-ink-500">No assignments yet.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {assignments.data?.map((a) => {
                    const done = submittedIds.has(a.id);
                    return (
                      <li key={a.id} className="border rounded-xl p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <div className="font-semibold text-sm">{a.title}</div>
                            {a.instructions && <p className="text-xs text-ink-500 mt-1">{a.instructions}</p>}
                            <p className="text-[10px] text-ink-400 mt-1">
                              {a.due_at ? `Due ${new Date(a.due_at).toLocaleDateString()}` : "No due date"}
                              {a.max_score ? ` · max ${a.max_score} pts` : ""}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {done ? "Submitted" : "Pending"}
                          </span>
                        </div>
                        {!done && (
                          <div className="mt-3 flex gap-2">
                            <textarea
                              rows={2}
                              value={drafts[a.id] ?? ""}
                              onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                              placeholder="Write your answer…"
                              className="flex-1 rounded-xl border border-ink-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
                            />
                            <Button size="sm" disabled={submit.isPending || !(drafts[a.id] ?? "").trim()}
                              onClick={() => submit.mutate({ assignmentId: a.id, content: drafts[a.id] ?? "" })}>
                              Submit
                            </Button>
                          </div>
                        )}
                        {done && submissions.data?.find((s) => s.assignment_id === a.id)?.feedback && (
                          <p className="mt-2 text-xs text-green-700">Feedback: {submissions.data.find((s) => s.assignment_id === a.id)?.feedback}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}

          {section === "Quizzes" && (
            <section className="border rounded-2xl p-6">
              <StudentQuizzes />
            </section>
          )}

          {section === "Progress" && (
            <section className="border rounded-2xl p-6">
              <h2 className="font-bold text-lg">Progress summary</h2>
              {attendance.data ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex justify-between text-sm"><span className="text-ink-600">Attendance</span><span className="font-bold">{attendance.data.rate.toFixed(1)}%</span></div>
                    <div className="mt-1 h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full bg-brand-blue" style={{ width: `${attendance.data.rate}%` }} /></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                    <div className="rounded-xl bg-green-50 p-3"><div className="text-xl font-extrabold text-green-700">{attendance.data.present}</div><div className="text-[10px] text-ink-500">Present</div></div>
                    <div className="rounded-xl bg-red-50 p-3"><div className="text-xl font-extrabold text-red-700">{attendance.data.absent}</div><div className="text-[10px] text-ink-500">Absent</div></div>
                    <div className="rounded-xl bg-amber-50 p-3"><div className="text-xl font-extrabold text-amber-700">{attendance.data.late}</div><div className="text-[10px] text-ink-500">Late</div></div>
                    <div className="rounded-xl bg-ink-50 p-3"><div className="text-xl font-extrabold text-ink-600">{attendance.data.untracked}</div><div className="text-[10px] text-ink-500">Untracked</div></div>
                  </div>
                  <p className="text-xs text-ink-400">Attendance and assignment progress update after each lesson. Term reports arrive with the gradebook phase.</p>
                </div>
              ) : (
                <Skeleton className="h-24 w-full mt-3" />
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function groupByDate(lessons: Lesson[]): [string, Lesson[]][] {
  const map = new Map<string, Lesson[]>();
  [...lessons]
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .forEach((l) => {
      const key = new Date(l.start_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      map.set(key, [...(map.get(key) ?? []), l]);
    });
  return [...map.entries()];
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\student-dashboard\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/student-dashboard/page.tsx'

Write-Host 'Done. git add those files, commit, push. Do not add APPLY86.ps1.'
