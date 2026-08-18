# APPLY90.ps1 — dark CSS, admin users, LMS materials. Run SANITIZE90.ps1 first.
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\client\app')) { throw 'Run from ykay-virtual repo root.' }
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
  --color-background: #07140e;
  --color-background-soft: #0d1f16;
  --color-background-muted: #10281c;
  --color-surface: #0d1f16;
  --color-surface-muted: #10281c;
  --color-text: #f4f7f5;
  --color-text-primary: #ffffff;
  --color-text-secondary: #c9d6ce;
  --color-text-muted: #91a49a;
  --color-border: #214c37;
  --color-border-light: #173b2a;
}


html.dark body {
  background: #07140e;
  color: #f4f7f5;
}


html.dark ::-webkit-scrollbar-track {
  background: #0d1f16;
}


html.dark header,
html.dark footer {
  background-color: #0d1f16;
  border-color: #214c37;
}


html.dark .bg-white,
html.dark .bg-surface,
html.dark .bg-surface-white,
html.dark .bg-surface-subtle {
  background-color: #0d1f16;
}


html.dark .bg-\[\#FFF7E4\],
html.dark .bg-surface-muted,
html.dark .bg-peach,
html.dark .section-peach,
html.dark .section-white {
  background-color: #07140e;
  color: #f4f7f5;
}


html.dark .card,
html.dark .card-peach {
  background: #0d1f16;
  color: #f4f7f5;
  border-color: #214c37;
}


html.dark .text-brand-navy,
html.dark .text-ink-950,
html.dark .text-ink-900,
html.dark .text-ink-800 {
  color: #f8faf8;
}


html.dark .text-ink-700 {
  color: #d7e0db;
}


html.dark .text-ink-600 {
  color: #b1c0b8;
}


html.dark .text-ink-500 {
  color: #91a49a;
}


html.dark .text-ink-400 {
  color: #71857a;
}


html.dark .border-ink-50,
html.dark .border-ink-100 {
  border-color: #173b2a;
}


html.dark .border-ink-200,
html.dark .border-ink-300 {
  border-color: #2d6148;
}


html.dark .shadow-sm,
html.dark .shadow-md,
html.dark .shadow-lg,
html.dark .shadow-soft,
html.dark .shadow-card,
html.dark .shadow-lift {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
}


html.dark .bg-ink-50 {
  background-color: #10281c;
}


html.dark .bg-ink-100 {
  background-color: #173b2a;
}


html.dark .bg-ink-200 {
  background-color: #214c37;
}


html.dark input:not([type="checkbox"]):not([type="radio"]),
html.dark textarea,
html.dark select {
  background-color: #10281c;
  color: #f4f7f5;
  border-color: #2d6148;
}


html.dark input::placeholder,
html.dark textarea::placeholder {
  color: #71857a;
}


html.dark .btn-outline {
  color: #f4f7f5;
  border-color: #c9d6ce;
}


html.dark a {
  color: #8ef56e;
}


html.dark a:hover {
  color: #70f250;
}


html.dark .text-white a,
html.dark .bg-brand-navy a {
  color: inherit;
}


html.dark .text-brand-blue,
html.dark .text-brand-blue-dark {
  color: #8ef56e;
}


html.dark .bg-brand-blue-light,
html.dark .bg-brand-gold-light {
  background-color: #173b2a;
  color: #f4f7f5;
}


html.dark .bg-amber-50,
html.dark .bg-red-50,
html.dark .bg-green-50 {
  background-color: #10281c;
}


html.dark .text-amber-800,
html.dark .text-red-700 {
  color: #fde68a;
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

New-Item -ItemType Directory -Force -Path 'client\app\admin' | Out-Null
$content = @'
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getAdminStats2 } from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { PageHeader } from "@/components/dashboard/PageHeader";

// Admin dashboard (working-doc §12): KPI cards - active learners | tutors |
// cohorts | lessons this week | revenue + pending applications/enrolments,
// today's classes, capacity alerts, support tickets, QA alerts.

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "bg-brand-blue text-white border-brand-blue" : "bg-white"}`}>
      <div className={`text-2xl font-extrabold ${accent ? "text-white" : "text-brand-blue"}`}>{value}</div>
      <div className={`text-xs mt-1 ${accent ? "text-white/80" : "text-ink-500"}`}>{label}</div>
      {sub && <div className={`text-[10px] mt-1 ${accent ? "text-white/60" : "text-ink-400"}`}>{sub}</div>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const stats = useQuery({
    queryKey: ["admin", "stats2"],
    queryFn: getAdminStats2,
    staleTime: 60_000,
  });

  if (stats.isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"><RoleGate page="/admin" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const s = stats.data;

  return (
    <div className="space-y-8">
      <RoleGate page="/admin" />
      <PageHeader eyebrow="Admin" title="Overview" cover="/hero/checkout.jpg" />

      {/* KPI row */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active learners" value={s?.active_users.toLocaleString() ?? "-"} sub={`${s?.users.toLocaleString()} registered`} accent />
        <StatCard label="Tutors (approved)" value={s?.tutors_approved.toLocaleString() ?? "-"} sub={`${s?.tutors_pending.toLocaleString()} pending vetting`} />
        <StatCard label="Cohorts (published)" value={s?.cohorts_published.toLocaleString() ?? "-"} sub={`${s?.lessons_this_week.toLocaleString()} lessons this week`} />
        <StatCard label="Revenue" value={`₦${(s?.revenue_in_escrow ?? 0).toLocaleString()}`} sub={`${(s?.revenue_paid_out ?? 0).toLocaleString()} paid out`} accent />
      </section>

      {/* Operational */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Lessons today" value={s?.lessons_today.toLocaleString() ?? "-"} />
        <StatCard label="Pending enrolments" value={s?.pending_enrolments.toLocaleString() ?? "-"} />
        <StatCard label="Orders (total / paid)" value={`${s?.orders_total ?? 0}/${s?.orders_paid ?? 0}`} />
        <StatCard label="Blog published" value={s?.blog_published.toLocaleString() ?? "-"} sub={`${s?.blog_drafts.toLocaleString()} drafts`} />
      </section>

      {/* Attention needed */}
      {(s?.pending_enrolments ?? 0) > 0 || (s?.overdue_lesson_notes ?? 0) > 0 || (s?.support_open ?? 0) > 0 || (s?.escrow_disputed ?? 0) > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-800">Needs attention</h2>
          <ul className="mt-2 text-sm text-amber-800 list-disc pl-5 space-y-1">
            {s?.pending_enrolments ? <li>{s.pending_enrolments} pending enrollment(s) / payment exception(s)</li> : null}
            {s?.overdue_lesson_notes ? <li>{s.overdue_lesson_notes} completed lesson(s) missing tutor notes (QA alert)</li> : null}
            {s?.support_open ? <li><Link href="/admin/support" className="underline">{s.support_open} open support ticket(s)</Link></li> : null}
            {s?.escrow_disputed ? <li>{s.escrow_disputed} disputed escrow hold(s)</li> : null}
            {s?.pending_refunds ? <li>{s.pending_refunds} pending/failed order(s) awaiting review</li> : null}
          </ul>
        </section>
      ) : null}

      {/* Module quick links */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: "/admin/vetting", label: "Tutor vetting queue", desc: "Applications, documents, approvals" },
          { href: "/admin/cohorts", label: "Cohorts", desc: "Create, publish, manage capacity" },
          { href: "/admin/lessons", label: "Today's classes", desc: "Attendance & lesson overview" },
          { href: "/admin/support", label: "Support tickets", desc: "Resolve and escalate" },
          { href: "/admin/chat", label: "Chat agent inbox", desc: "Escalated conversations, replies, ratings" },
          { href: "/admin/payments", label: "Payments", desc: "Orders, confirmations, refunds, payouts" },
          { href: "/admin/reviews", label: "Review moderation", desc: "Consent-gated publishing" },
          { href: "/admin/blog", label: "Blog CMS", desc: "Publish study content" },
        ].map((m) => (
          <Link key={m.href} href={m.href} className="border rounded-2xl p-5 hover:border-brand-blue hover:shadow-lift transition-all">
            <h3 className="font-bold text-sm">{m.label}</h3>
            <p className="text-xs text-ink-500 mt-1">{m.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\admin\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/admin/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\admin\users' | Out-Null
$content = @'
"use client";

import { useSession } from "@/hooks/useSession";
import { isAdmin } from "@/features/auth/api";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats2 } from "@/features/admin/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import Link from "next/link";

// Super-admin staff view. Role grants stay server-side (no self-serve SUPER_ADMIN).

export default function AdminUsersPage() {
  const { user } = useSession();
  const superAdmin = !!user?.roles?.includes("SUPER_ADMIN");
  const stats = useQuery({ queryKey: ["admin", "stats2"], queryFn: getAdminStats2, enabled: !!user && isAdmin(user) });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Staff" title="Users" cover="/hero/about.jpg" />
      {!superAdmin && (
        <p className="rounded-2xl border border-ink-100 bg-white p-4 text-sm text-ink-600">
          You can view platform counts. Granting SUPER_ADMIN or ACADEMIC_ADMIN is not self-serve.
        </p>
      )}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { l: "Registered", v: stats.data?.users },
          { l: "Active", v: stats.data?.active_users },
          { l: "Tutors pending", v: stats.data?.tutors_pending },
        ].map((c) => (
          <div key={c.l} className="rounded-2xl border border-ink-100 bg-white p-4">
            <p className="text-2xl font-extrabold text-brand-navy">{c.v ?? "-"}</p>
            <p className="text-xs font-semibold text-ink-500">{c.l}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        <Link href="/admin/vetting" className="rounded-2xl border border-ink-100 bg-white p-5 hover:border-brand-gold">
          <h2 className="font-bold text-brand-navy">Tutor applications</h2>
          <p className="mt-1 text-sm text-ink-500">Approve or hold tutor vetting.</p>
        </Link>
        <Link href="/admin/payments" className="rounded-2xl border border-ink-100 bg-white p-5 hover:border-brand-gold">
          <h2 className="font-bold text-brand-navy">Payments</h2>
          <p className="mt-1 text-sm text-ink-500">Orders, refunds, payouts.</p>
        </Link>
      </section>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\admin\users\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/admin/users/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\lib' | Out-Null
$content = @'
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CalendarDays,
  MessageSquare,
  Bell,
  Settings,
  Wallet,
  Users,
  BadgeCheck,
  Newspaper,
  Building2,
  Gift,
  Star,
  LifeBuoy,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type AppShellVariant = "parent" | "student" | "tutor" | "admin";

export const APP_NAV: Record<AppShellVariant, { title: string; home: string; items: AppNavItem[] }> = {
  parent: {
    title: "Parent portal",
    home: "/dashboard",
    items: [
      { href: "/dashboard", label: "Family dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms", label: "Learning", icon: GraduationCap },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Account", icon: Settings },
    ],
  },
  student: {
    title: "Student portal",
    home: "/student-dashboard",
    items: [
      { href: "/student-dashboard", label: "My dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms", label: "My learning", icon: BookOpen },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Account", icon: Settings },
    ],
  },
  tutor: {
    title: "Tutor workspace",
    home: "/tutor-dashboard",
    items: [
      { href: "/tutor-dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/lms/tutor", label: "Teaching", icon: ClipboardCheck },
      { href: "/messages", label: "Messages", icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/account", label: "Account", icon: Settings },
    ],
  },
  admin: {
    title: "Admin console",
    home: "/admin",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/vetting", label: "Tutor vetting", icon: BadgeCheck },
      { href: "/admin/cohorts", label: "Cohorts", icon: CalendarDays },
      { href: "/admin/lessons", label: "Today's classes", icon: Users },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
      { href: "/admin/blog", label: "Blog CMS", icon: Newspaper },
      { href: "/admin/institutions", label: "Institutions", icon: Building2 },
      { href: "/admin/referrals", label: "Referrals", icon: Gift },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/payments", label: "Payments", icon: Wallet },
    ],
  },
};

export function variantForRoles(roles: string[]): AppShellVariant {
  if (roles.some((r) => r === "SUPER_ADMIN" || r === "ACADEMIC_ADMIN")) return "admin";
  if (roles.includes("TUTOR")) return "tutor";
  if (roles.includes("STUDENT")) return "student";
  return "parent";
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\lib\app-nav.ts'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/lib/app-nav.ts'

New-Item -ItemType Directory -Force -Path 'client\app\lms\tutor\cohorts\[cohortId]' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getCohort,
  getCohortLessons,
  getCohortAssignments,
  getCohortResources,
  getCohortEnrollments,
  createCohortAssignment,
  createCohortResource,
  createAssessment,
  getLessonAttendance,
  markAttendance,
  type AttendanceRow,
} from "@/features/lms/api";
import {
  listSubmissions,
  gradeSubmission,
  listAssessments,
  createProgressReport,
  type GradedSubmission,
} from "@/features/learning/api";

// Tutor cohort console - attendance, submissions grading, quiz list and
// progress-report creation for one cohort.

export default function LmsTutorCohortPage() {
  const params = useParams<{ cohortId: string }>();
  const cohortId = params.cohortId;
  const qc = useQueryClient();

  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [report, setReport] = useState({ strengths: "", weaknesses: "", recommendations: "", rating: "4" });
  const [reportStudentId, setReportStudentId] = useState("");

  // Authoring forms (LMS beyond MVP)
  const [quizDraft, setQuizDraft] = useState({
    title: "",
    instructions: "",
    pass_threshold: "70",
    questions: [{ question: "", options: ["", "", "", ""], correct_index: 0 }],
  });
  const [assignmentDraft, setAssignmentDraft] = useState({ title: "", instructions: "", max_score: "10" });
  const [resourceDraft, setResourceDraft] = useState({ title: "", description: "", file_url: "" });
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);

  const roster = useQuery({
    queryKey: ["lms", "roster", cohortId],
    queryFn: () => getCohortEnrollments(cohortId),
  });
  const resources = useQuery({
    queryKey: ["lms", "resources", cohortId],
    queryFn: () => getCohortResources(cohortId),
  });

  const createQuiz = useMutation({
    mutationFn: () =>
      createAssessment({
        cohort_id: cohortId,
        title: quizDraft.title,
        instructions: quizDraft.instructions || undefined,
        pass_threshold: Number(quizDraft.pass_threshold) || 70,
        questions: quizDraft.questions
          .filter((q) => q.question.trim())
          .map((q) => ({ question: q.question, options: q.options, correct_index: q.correct_index })),
      }),
    onSuccess: () => {
      toast.success("Quiz published");
      setShowQuizBuilder(false);
      setQuizDraft({ title: "", instructions: "", pass_threshold: "70", questions: [{ question: "", options: ["", "", "", ""], correct_index: 0 }] });
      qc.invalidateQueries({ queryKey: ["lms", "quizzes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create quiz"),
  });

  const createAssignment = useMutation({
    mutationFn: () =>
      createCohortAssignment(cohortId, {
        title: assignmentDraft.title,
        instructions: assignmentDraft.instructions || undefined,
        max_score: Number(assignmentDraft.max_score) || undefined,
      }),
    onSuccess: () => {
      toast.success("Assignment published");
      setShowAssignmentForm(false);
      setAssignmentDraft({ title: "", instructions: "", max_score: "10" });
      qc.invalidateQueries({ queryKey: ["lms", "assignments"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create assignment"),
  });

  const createResource = useMutation({
    mutationFn: () =>
      createCohortResource(cohortId, {
        title: resourceDraft.title,
        description: resourceDraft.description || undefined,
        file_url: resourceDraft.file_url || undefined,
      }),
    onSuccess: () => {
      toast.success("Resource added");
      setShowResourceForm(false);
      setResourceDraft({ title: "", description: "", file_url: "" });
      qc.invalidateQueries({ queryKey: ["lms", "resources"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create resource"),
  });

  const cohort = useQuery({ queryKey: ["lms", "cohort", cohortId], queryFn: () => getCohort(cohortId) });
  const lessons = useQuery({ queryKey: ["lms", "lessons", cohortId], queryFn: () => getCohortLessons(cohortId) });
  const assignments = useQuery({ queryKey: ["lms", "assignments", cohortId], queryFn: () => getCohortAssignments(cohortId) });
  const quizzes = useQuery({ queryKey: ["lms", "quizzes", cohortId], queryFn: () => listAssessments(cohortId) });

  const lessonId = selectedLessonId || lessons.data?.[0]?.id || "";
  const attendanceRows = useQuery({
    queryKey: ["lms", "attendance", lessonId],
    queryFn: () => getLessonAttendance(lessonId),
    enabled: !!lessonId,
  });

  const submissions = useQuery({
    queryKey: ["lms", "submissions", assignments.data?.[0]?.id],
    queryFn: () => listSubmissions(assignments.data![0].id),
    enabled: (assignments.data?.length ?? 0) > 0,
  });

  const mark = useMutation({
    mutationFn: (row: AttendanceRow) =>
      markAttendance(lessonId, {
        student_profile_id: row.student_profile_id,
        status: attendance[row.student_profile_id] ?? "PRESENT",
      }),
    onSuccess: () => {
      toast.success("Attendance updated");
      qc.invalidateQueries({ queryKey: ["lms", "attendance"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update attendance"),
  });

  const gradeIt = useMutation({
    mutationFn: (s: GradedSubmission) => gradeSubmission(s.id, Number(grade[s.id] ?? 0), feedback[s.id] || undefined),
    onSuccess: () => {
      toast.success("Submission graded");
      qc.invalidateQueries({ queryKey: ["lms", "submissions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not grade"),
  });

  const createReport = useMutation({
    mutationFn: () =>
      createProgressReport({
        student_profile_id: reportStudentId,
        period_start: new Date(Date.now() - 7 * 864e5).toISOString(),
        period_end: new Date().toISOString(),
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        recommendations: report.recommendations,
        overall_rating: Number(report.rating),
      }),
    onSuccess: () => {
      toast.success("Progress report created");
      setReport({ strengths: "", weaknesses: "", recommendations: "", rating: "4" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create report"),
  });

  return (
    <main className="min-h-screen bg-[#FFF7E4] pb-16">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/lms/tutor" className="hover:text-brand-gold-dark">My Teaching</Link> /{" "}
            <span className="text-ink-600">{cohort.data?.title ?? "Cohort"}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">
                {cohort.data?.title ?? "Loading cohort..."}
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Teaching console - attendance, grading and reports.
                {cohort.data ? `  |  ${cohort.data.enrolled_count} enrolled` : ""}
              </p>
            </div>
            <Link href="/lms/tutor" className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300">
              ← Back to My Teaching
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Attendance console */}
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-brand-navy">Attendance</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(lessons.data ?? []).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLessonId(l.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold",
                    lessonId === l.id ? "bg-brand-navy text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                  )}
                >
                  {l.title}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {(attendanceRows.data ?? []).map((row) => (
                <div key={row.student_profile_id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-gold-light text-xs font-bold text-brand-navy">
                    {row.student_profile_id.slice(-2).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold text-ink-700">{row.student_profile_id}</span>
                  <select
                    className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs font-semibold text-ink-700 focus:border-brand-gold focus:outline-none"
                    value={attendance[row.student_profile_id] ?? row.status}
                    onChange={(e) => setAttendance((m) => ({ ...m, [row.student_profile_id]: e.target.value }))}
                  >
                    {["PRESENT", "LATE", "ABSENT", "EXCUSED"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={mark.isPending}
                    onClick={() => mark.mutate(row)}
                    className="rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              ))}
              {(attendanceRows.data ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-ink-400">
                  No attendance records for this lesson yet. {lessonId ? "Try another lesson." : ""}
                </p>
              )}
            </div>
          </section>

          {/* Grading console */}
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-brand-navy">Grading</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(assignments.data ?? []).map((a) => (
                <span key={a.id} className="rounded-lg bg-brand-gold-light px-3 py-1.5 text-xs font-bold text-brand-navy">
                  {a.title}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {(submissions.data ?? []).map((s) => (
                <div key={s.id} className="rounded-xl border border-ink-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-700">Submission {s.student_profile_id.slice(-4)}</span>
                    {s.score !== undefined ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                        {s.score}/10 graded
                      </span>
                    ) : (
                      <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-bold text-ink-500">Pending</span>
                    )}
                  </div>
                  {s.content && <p className="mt-2 rounded-lg bg-[#FFF7E4] p-3 text-sm text-ink-600">{s.content}</p>}
                  {s.feedback && <p className="mt-1 text-xs text-ink-400">Feedback: {s.feedback}</p>}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      placeholder="Score /10"
                      className="h-10 w-24 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                      value={grade[s.id] ?? s.score ?? ""}
                      onChange={(e) => setGrade((m) => ({ ...m, [s.id]: e.target.value }))}
                    />
                    <input
                      type="text"
                      placeholder="Feedback..."
                      className="h-10 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                      value={feedback[s.id] ?? s.feedback ?? ""}
                      onChange={(e) => setFeedback((m) => ({ ...m, [s.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      disabled={gradeIt.isPending || grade[s.id] === "" && s.score === undefined}
                      onClick={() => gradeIt.mutate(s)}
                      className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
                    >
                      Grade
                    </button>
                  </div>
                </div>
              ))}
              {(submissions.data ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-ink-400">No submissions to grade yet.</p>
              )}
            </div>
          </section>
        </div>

        {/* Roster */}
        <section className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-brand-navy">Class roster ({cohort.data?.enrolled_count ?? roster.data?.length ?? "-"})</h2>
            <span className="text-xs text-ink-400">Learners enrolled in this cohort</span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-4">Learner</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {(roster.data ?? []).map((r) => (
                  <tr key={r.student_profile_id} className="border-b border-ink-50 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold text-ink-800">{r.name || r.student_profile_id.slice(0, 8) + "..."}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-brand-gold-light px-2.5 py-0.5 text-xs font-bold text-brand-navy">{r.status}</span>
                    </td>
                    <td className="py-2.5 text-ink-500">{new Date(r.enrolled_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(roster.data ?? []).length === 0 && (
                  <tr><td colSpan={3} className="py-6 text-center text-ink-400">No enrollments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Authoring console */}
        <section className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-brand-navy">Create content</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowQuizBuilder((v) => !v)} className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-navy/90">+ Quiz</button>
              <button type="button" onClick={() => setShowAssignmentForm((v) => !v)} className="rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover">+ Assignment</button>
              <button type="button" onClick={() => setShowResourceForm((v) => !v)} className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-700 hover:border-ink-300">+ Resource</button>
            </div>
          </div>

          {showQuizBuilder && (
            <div className="mt-4 space-y-3 rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-bold text-ink-700">New quiz</p>
              <div className="grid gap-3 md:grid-cols-3">
                <input type="text" aria-label="Quiz title" placeholder="Quiz title" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={quizDraft.title} onChange={(e) => setQuizDraft((d) => ({ ...d, title: e.target.value }))} />
                <input type="text" aria-label="Quiz instructions" placeholder="Instructions" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={quizDraft.instructions} onChange={(e) => setQuizDraft((d) => ({ ...d, instructions: e.target.value }))} />
                <input type="number" aria-label="Pass percentage" placeholder="Pass %" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={quizDraft.pass_threshold} onChange={(e) => setQuizDraft((d) => ({ ...d, pass_threshold: e.target.value }))} />
              </div>
              <div className="space-y-3">
                {quizDraft.questions.map((q, qi) => (
                  <div key={qi} className="rounded-lg border border-ink-100 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-400">Q{qi + 1}</span>
                      <input type="text" aria-label="Question text" placeholder="Question" className="h-9 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={q.question} onChange={(e) => setQuizDraft((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, question: e.target.value } : x)) }))} />
                      <button type="button" onClick={() => setQuizDraft((d) => ({ ...d, questions: d.questions.filter((_, i) => i !== qi) }))} className="text-xs font-bold text-red-500">✕</button>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" checked={q.correct_index === oi} onChange={() => setQuizDraft((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, correct_index: oi } : x)) }))} title="Correct answer" />
                          <input type="text" placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="h-9 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={opt} onChange={(e) => setQuizDraft((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, options: x.options.map((o, j) => (j === oi ? e.target.value : o)) } : x)) }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setQuizDraft((d) => ({ ...d, questions: [...d.questions, { question: "", options: ["", "", "", ""], correct_index: 0 }] }))} className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-bold text-ink-600 hover:border-ink-300">+ Add question</button>
                <button type="button" disabled={createQuiz.isPending || !quizDraft.title.trim() || quizDraft.questions.filter((q) => q.question.trim()).length === 0} onClick={() => createQuiz.mutate()} className="rounded-lg bg-brand-gold px-4 py-2 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40">
                  {createQuiz.isPending ? "Publishing..." : "Publish quiz"}
                </button>
              </div>
            </div>
          )}

          {showAssignmentForm && (
            <div className="mt-4 space-y-3 rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-bold text-ink-700">New assignment</p>
              <div className="grid gap-3 md:grid-cols-3">
                <input type="text" aria-label="Assignment title" placeholder="Title" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={assignmentDraft.title} onChange={(e) => setAssignmentDraft((d) => ({ ...d, title: e.target.value }))} />
                <input type="text" aria-label="Quiz instructions" placeholder="Instructions" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={assignmentDraft.instructions} onChange={(e) => setAssignmentDraft((d) => ({ ...d, instructions: e.target.value }))} />
                <input type="number" aria-label="Max score" placeholder="Max score" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={assignmentDraft.max_score} onChange={(e) => setAssignmentDraft((d) => ({ ...d, max_score: e.target.value }))} />
              </div>
              <button type="button" disabled={createAssignment.isPending || !assignmentDraft.title.trim()} onClick={() => createAssignment.mutate()} className="rounded-lg bg-brand-gold px-4 py-2 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40">
                {createAssignment.isPending ? "Publishing..." : "Publish assignment"}
              </button>
            </div>
          )}

          {(resources.data ?? []).length > 0 && (
            <ul className="mt-4 space-y-2">
              {(resources.data ?? []).map((r) => {
                const url = r.file_url ?? "";
                const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{6,})/);
                return (
                  <li key={r.id} className="rounded-xl border border-ink-100 p-3">
                    <p className="text-sm font-semibold text-ink-800">{r.title}</p>
                    {r.description ? <p className="text-xs text-ink-500">{r.description}</p> : null}
                    {yt ? (
                      <div className="mt-2 overflow-hidden rounded-lg bg-black aspect-video">
                        <iframe title={r.title} className="h-full w-full" src={`https://www.youtube.com/embed/${yt[1]}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    ) : url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-bold text-brand-navy underline">Open file / video</a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {showResourceForm && (
            <div className="mt-4 space-y-3 rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-bold text-ink-700">Material or video</p>
              <p className="text-xs text-ink-500">Paste a YouTube, Drive, or file URL. Hosting video files on this server is not enabled on the free plan.</p>
              <div className="grid gap-3 md:grid-cols-3">
                <input type="text" aria-label="Resource title" placeholder="Title" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={resourceDraft.title} onChange={(e) => setResourceDraft((d) => ({ ...d, title: e.target.value }))} />
                <input type="text" aria-label="Resource description" placeholder="Description" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={resourceDraft.description} onChange={(e) => setResourceDraft((d) => ({ ...d, description: e.target.value }))} />
                <input type="url" aria-label="File or video URL" placeholder="https://youtube.com/watch?v=... or file URL" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={resourceDraft.file_url} onChange={(e) => setResourceDraft((d) => ({ ...d, file_url: e.target.value }))} />
              </div>
              <button type="button" disabled={createResource.isPending || !resourceDraft.title.trim()} onClick={() => createResource.mutate()} className="rounded-lg bg-brand-gold px-4 py-2 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40">
                {createResource.isPending ? "Adding..." : "Add material"}
              </button>
            </div>
          )}
        </section>

        {/* Quizzes + progress report */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-brand-navy">Quizzes in this cohort</h2>
            <div className="mt-3 space-y-2">
              {(quizzes.data ?? []).map((q) => (
                <div key={q.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{q.title}</p>
                    <p className="text-xs text-ink-400">Pass {q.pass_threshold}%  |  {q.status}</p>
                  </div>
                  <span className="rounded-full bg-brand-gold-light px-2.5 py-1 text-xs font-bold text-brand-navy">Auto-graded</span>
                </div>
              ))}
              {(quizzes.data ?? []).length === 0 && <p className="py-6 text-center text-sm text-ink-400">No quizzes yet.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-brand-navy">New progress report</h2>
            <div className="mt-3 space-y-3">
              <select
                className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                value={reportStudentId}
                onChange={(e) => setReportStudentId(e.target.value)}
              >
                <option value="">Select learner...</option>
                {(roster.data ?? []).map((r) => (
                  <option key={r.student_profile_id} value={r.student_profile_id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Strengths (e.g. strong grasp of algebra)"
                className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                value={report.strengths}
                onChange={(e) => setReport((r) => ({ ...r, strengths: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Weaknesses"
                className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                value={report.weaknesses}
                onChange={(e) => setReport((r) => ({ ...r, weaknesses: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Recommendations"
                className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                value={report.recommendations}
                onChange={(e) => setReport((r) => ({ ...r, recommendations: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-500">Rating:</span>
                {["1", "2", "3", "4", "5"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReport((r) => ({ ...r, rating: n }))}
                    className={cn(
                      "grid size-9 place-items-center rounded-full text-sm font-bold",
                      report.rating === n ? "bg-brand-gold text-ink-900" : "bg-ink-100 text-ink-500"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={createReport.isPending || !report.strengths || !reportStudentId}
                onClick={() => createReport.mutate()}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
              >
                {createReport.isPending ? "Creating..." : "Publish report"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\lms\tutor\cohorts\[cohortId]\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/lms/tutor/cohorts/[cohortId]/page.tsx'

Write-Host 'Done.'
