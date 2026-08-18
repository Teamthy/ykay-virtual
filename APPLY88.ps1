# APPLY88.ps1 — dark mode, compact cohorts, tutor search, skeletons.
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.\client\app\globals.css')) { throw 'Run from ykay-virtual repo root.' }
$utf8 = New-Object System.Text.UTF8Encoding $false

New-Item -ItemType Directory -Force -Path 'client' | Out-Null
$content = @'
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",

  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      /* ==========================================================
         COLORS
         ========================================================== */

      colors: {
        /*
         * --------------------------------------------------------
         * NUVORA BRAND
         * --------------------------------------------------------
         */

        primary: {
          DEFAULT: "#70F250",
          hover: "#5FE63F",
          dark: "#4CCB31",
          light: "#DFFFF2",
        },

        green: {
          DEFAULT: "#70F250",
          hover: "#5FE63F",
          dark: "#4CCB31",
          light: "#DFFFF2",
        },

        deep: {
          DEFAULT: "#013920",
          light: "#0A4D32",
          dark: "#002A18",
        },

        peach: {
          DEFAULT: "#FFF7E4",
          dark: "#F8EBCF",
        },

        black: "#000000",
        white: "#FFFFFF",


        /*
         * --------------------------------------------------------
         * TEXT / INK
         * --------------------------------------------------------
         */

        ink: {
          950: "#000000",
          900: "#111111",
          800: "#181818",
          700: "#333333",
          600: "#555555",
          500: "#52645B",
          400: "#71857A",
          300: "#B8C4BD",
          200: "#DCE5DE",
          100: "#EDE8DC",
          50: "#F8F7F2",
        },


        /*
         * --------------------------------------------------------
         * SURFACES
         * --------------------------------------------------------
         */

        surface: {
          DEFAULT: "#FFF7E4",
          white: "#FFFFFF",
          muted: "#F8EBCF",
          subtle: "#FFFFFF",
          dark: "#013920",
          black: "#000000",
        },


        /*
         * --------------------------------------------------------
         * BORDERS
         * --------------------------------------------------------
         */

        border: {
          DEFAULT: "#DCE5DE",
          light: "#EDE8DC",
          dark: "#285442",
        },


        /*
         * --------------------------------------------------------
         * SEMANTIC COLORS
         * --------------------------------------------------------
         */

        success: {
          DEFAULT: "#4CCB31",
          light: "#E6FFDE",
        },

        error: {
          DEFAULT: "#D83A3A",
          light: "#FDECEC",
        },

        warning: {
          DEFAULT: "#F4B400",
          light: "#FFF3C4",
        },

        info: {
          DEFAULT: "#013920",
          light: "#DFFFF2",
        },


        /*
         * --------------------------------------------------------
         * LEGACY BRAND ALIASES
         * --------------------------------------------------------
         *
         * These are intentionally kept so existing components
         * using brand-* classes do not break during migration.
         *
         * New components should use:
         * bg-primary
         * bg-deep
         * bg-peach
         * bg-black
         */

        brand: {
          green: "#70F250",
          "green-hover": "#5FE63F",
          "green-dark": "#4CCB31",
          "green-light": "#DFFFF2",

          "deep-green": "#013920",
          "deep-green-light": "#0A4D32",
          "deep-green-dark": "#002A18",

          peach: "#FFF7E4",
          "peach-dark": "#F8EBCF",

          black: "#000000",
          white: "#FFFFFF",

          /*
           * Legacy aliases
           */

          navy: "#013920",
          "navy-dark": "#002A18",

          blue: "#013920",
          "blue-dark": "#0A4D32",
          "blue-light": "#DFFFF2",

          gold: "#70F250",
          "gold-hover": "#5FE63F",
          "gold-dark": "#4CCB31",
          "gold-light": "#DFFFF2",

          /*
           * Kept only for old components.
           * These should eventually be removed.
           */

          orange: "#70F250",
          "orange-light": "#DFFFF2",

          purple: "#013920",

          "prep-orange": "#70F250",
        },
      },


      /* ==========================================================
         TYPOGRAPHY
         ========================================================== */

      fontFamily: {
        display: [
          "var(--font-display)",
          "Anton",
          "system-ui",
          "sans-serif",
        ],

        body: [
          "var(--font-body)",
          "DM Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],

        sans: [
          "var(--font-body)",
          "DM Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },


      /*
       * ==========================================================
       * FONT SIZES
       * ==========================================================
       *
       * Anton is a display font, so these use font-weight 400.
       * Do NOT use 700/800 on Anton expecting a heavier Anton.
       */

      fontSize: {
        "display-2xl": [
          "clamp(4rem, 9vw, 9rem)",
          {
            lineHeight: "0.92",
            letterSpacing: "-0.025em",
            fontWeight: "400",
          },
        ],

        "display-xl": [
          "clamp(3.5rem, 7vw, 7rem)",
          {
            lineHeight: "0.95",
            letterSpacing: "-0.025em",
            fontWeight: "400",
          },
        ],

        "display-lg": [
          "clamp(3rem, 6vw, 5.5rem)",
          {
            lineHeight: "0.98",
            letterSpacing: "-0.02em",
            fontWeight: "400",
          },
        ],

        "display-md": [
          "clamp(2.5rem, 4.5vw, 4rem)",
          {
            lineHeight: "1",
            letterSpacing: "-0.02em",
            fontWeight: "400",
          },
        ],

        "display-sm": [
          "clamp(2rem, 3.5vw, 3rem)",
          {
            lineHeight: "1.05",
            letterSpacing: "-0.015em",
            fontWeight: "400",
          },
        ],
      },


      /* ==========================================================
         BORDER RADIUS
         ========================================================== */

      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "20px",
        xl: "28px",
        "4xl": "2rem",
        full: "9999px",
      },


      /* ==========================================================
         BOX SHADOWS
         ========================================================== */

      boxShadow: {
        soft: "0 2px 8px rgba(1, 57, 32, 0.06)",

        card: "0 8px 24px rgba(1, 57, 32, 0.10)",

        lift: "0 16px 40px rgba(1, 57, 32, 0.14)",

        hero: "0 30px 80px rgba(1, 57, 32, 0.18)",

        brand: "0 10px 30px rgba(112, 242, 80, 0.28)",

        "brand-lg": "0 20px 50px rgba(112, 242, 80, 0.22)",
      },


      /* ==========================================================
         ANIMATIONS
         ========================================================== */

      animation: {
        "slide-down": "slideDown 0.25s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",

        "scale-in": "scaleIn 0.35s cubic-bezier(0.22, 1, 0.36, 1)",

        "hero-in":
          "heroIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",

        "hero-in-late":
          "heroIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both",

        float: "floatY 5s ease-in-out infinite",
      },


      /* ==========================================================
         KEYFRAMES
         ========================================================== */

      keyframes: {
        slideDown: {
          from: {
            opacity: "0",
            transform: "translateY(-10px)",
          },

          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        slideUp: {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
          },

          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        fadeIn: {
          from: {
            opacity: "0",
          },

          to: {
            opacity: "1",
          },
        },

        scaleIn: {
          from: {
            opacity: "0",
            transform: "scale(0.96)",
          },

          to: {
            opacity: "1",
            transform: "scale(1)",
          },
        },

        heroIn: {
          from: {
            opacity: "0",
            transform: "translateY(22px)",
          },

          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        floatY: {
          "0%, 100%": {
            transform: "translateY(0)",
          },

          "50%": {
            transform: "translateY(-9px)",
          },
        },
      },


      /* ==========================================================
         TRANSITIONS
         ========================================================== */

      transitionTimingFunction: {
        "brand": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },

  plugins: [],
};

export default config;
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\tailwind.config.ts'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/tailwind.config.ts'

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

New-Item -ItemType Directory -Force -Path 'client\components\ui' | Out-Null
$content = @'
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-xl bg-ink-100 dark:bg-[#173b2a]", className)} {...props} />;
}

export function TutorRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3">
      <Skeleton className="size-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="hidden h-8 w-20 rounded-full sm:block" />
    </div>
  );
}

export function CohortCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <Skeleton className="h-20 w-full rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 px-4 py-8 md:px-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\ui\skeleton.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/ui/skeleton.tsx'

New-Item -ItemType Directory -Force -Path 'client\features\cohorts\components' | Out-Null
$content = @'
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { coverFor } from "@/lib/covers";

export type CohortCardData = {
  id: string;
  title: string;
  href?: string;
  slug?: string;
  programme_title?: string;
  tutor_display_name?: string;
  start_date: string;
  end_date: string;
  timezone: string;
  schedule_description?: string;
  capacity: number;
  enrolled_count: number;
  fee: number;
  currency: string;
  location_mode?: string;
};

export function CohortCard({ c }: { c: CohortCardData }) {
  const seatsLeft = Math.max(0, c.capacity - c.enrolled_count);
  const full = seatsLeft === 0;
  const fill = c.capacity > 0 ? Math.min((c.enrolled_count / c.capacity) * 100, 100) : 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div
        className="relative flex h-20 items-end justify-between gap-2 bg-cover bg-center px-4 py-2.5"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(6,15,38,0.2), rgba(6,15,38,0.82)), url(${coverFor(c.title + c.id)})`,
        }}
      >
        <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-navy">
          Cohort
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-white">
          <MapPin size={11} />
          {c.location_mode === "IN_PERSON" ? "In person" : c.location_mode === "HYBRID" ? "Hybrid" : "Online"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-display text-base leading-snug tracking-[0.02em] text-brand-navy">
          {c.title}
        </h3>
        {c.programme_title && <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-ink-500">{c.programme_title}</p>}

        <div className="mt-2 flex items-center gap-1 text-[11px] text-ink-500">
          <CalendarDays size={12} className="text-brand-blue" />
          {new Date(c.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} →{" "}
          {new Date(c.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-ink-600">
              <Users size={12} className="text-brand-blue" />
              {full ? "Full" : `${seatsLeft} seats`}
            </span>
            <span className="font-bold text-brand-navy">{Math.round(fill)}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${fill >= 90 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-brand-green"}`}
              style={{ width: `${fill}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
          <span className="text-sm font-extrabold text-brand-navy">
            {c.currency} {c.fee.toLocaleString()}
          </span>
          <Link
            href={full ? "/cohorts" : (c.href ?? `/cohorts/${c.id}/enroll`)}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              full ? "cursor-not-allowed bg-ink-100 text-ink-400" : "bg-brand-navy text-white hover:bg-brand-blue"
            }`}
            aria-disabled={full}
          >
            {full ? "Full" : "Enrol"}
            {!full && <ArrowRight size={12} />}
          </Link>
        </div>
      </div>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\features\cohorts\components\CohortCard.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/features/cohorts/components/CohortCard.tsx'

New-Item -ItemType Directory -Force -Path 'client\features\tutors\components' | Out-Null
$content = @'
import Link from "next/link";
import Image from "next/image";
import { Star, BadgeCheck } from "lucide-react";
import { Tutor } from "../api/search";

const PORTRAITS = ["chinasa", "olanike", "oluwatobi", "adewale", "judith", "demilola"] as const;

function portraitSrc(tutor: Tutor): string {
  if (tutor.avatar_url) return tutor.avatar_url;
  if ((PORTRAITS as readonly string[]).includes(tutor.slug)) return `/tutors/${tutor.slug}.jpg`;
  let h = 0;
  for (let i = 0; i < tutor.slug.length; i++) h = (h + tutor.slug.charCodeAt(i)) % PORTRAITS.length;
  return `/tutors/${PORTRAITS[h]}.jpg`;
}

export function TutorCard({ tutor }: { tutor: Tutor }) {
  const subjectLine = (tutor.subjects ?? []).slice(0, 2).map((s) => s.name).join(" · ");
  const photo = portraitSrc(tutor);

  return (
    <article className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3 transition hover:border-brand-gold hover:shadow-soft">
      <Link href={`/tutors/${tutor.slug}`} className="relative shrink-0">
        <Image
          src={photo}
          alt={`${tutor.display_name} — NUVORA tutor`}
          width={56}
          height={56}
          className="size-14 rounded-full object-cover object-top ring-2 ring-ink-100"
        />
        <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-white text-brand-green shadow-sm">
          <BadgeCheck size={13} />
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/tutors/${tutor.slug}`} className="truncate font-semibold text-ink-900 hover:text-brand-blue">
          {tutor.display_name}
        </Link>
        <p className="truncate text-xs text-ink-500">
          {subjectLine ? `Teaches ${subjectLine}` : "Verified NUVORA tutor"}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-500">
          <Star size={11} className="text-brand-gold" fill="currentColor" strokeWidth={0} />
          <b className="text-ink-800">{tutor.rating_avg.toFixed(1)}</b>
          <span>({tutor.rating_count})</span>
          {tutor.years_experience ? <span>· {tutor.years_experience} yrs</span> : null}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Link
          href={`/tutors/${tutor.slug}`}
          className="rounded-full bg-brand-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-blue"
        >
          View
        </Link>
        <Link href={`/messages?tutor=${tutor.id}`} className="text-[11px] font-semibold text-ink-500 hover:text-brand-navy">
          Message
        </Link>
      </div>
    </article>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\features\tutors\components\TutorCard.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/features/tutors/components/TutorCard.tsx'

New-Item -ItemType Directory -Force -Path 'client\features\tutors\components' | Out-Null
$content = @'
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchTutors, type SearchParams } from "@/features/tutors/api/search";
import { TutorCard } from "@/features/tutors/components/TutorCard";
import { TutorRowSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, Users } from "lucide-react";

export function TutorsSearchClient({ initialSubject }: { initialSubject?: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [subject, setSubject] = useState(initialSubject ?? sp.get("subject") ?? "");
  const [online, setOnline] = useState<boolean>(sp.get("online") === "true");
  const [inPerson, setInPerson] = useState<boolean>(sp.get("in_person") === "true");
  const [sort, setSort] = useState(sp.get("sort") ?? "ranking_score");

  const params: SearchParams = useMemo(() => {
    const p: SearchParams = { sort, page_size: 16 };
    if (q) p.q = q;
    if (subject) p.subject = subject;
    if (online) p.online = true;
    if (inPerson) p.in_person = true;
    return p;
  }, [q, subject, online, inPerson, sort]);

  const applyFilters = (next: Record<string, unknown>) => {
    const qs = new URLSearchParams();
    const merged = { q, subject, online, in_person: inPerson, sort, ...next };
    if (merged.q) qs.set("q", String(merged.q));
    if (merged.subject) qs.set("subject", String(merged.subject));
    if (merged.online) qs.set("online", "true");
    if (merged.in_person) qs.set("in_person", "true");
    qs.set("sort", String(merged.sort));
    router.push(`/tutors?${qs.toString()}`, { scroll: false });
  };

  const query = useInfiniteQuery({
    queryKey: ["tutors", "search", params],
    queryFn: ({ pageParam = 1 }) => searchTutors({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const meta = last.meta;
      return meta && meta.has_next ? meta.page + 1 : undefined;
    },
    staleTime: 0,
  });

  const tutors = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta?.total_items ?? tutors.length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
        <form
          className="flex flex-col gap-3 md:flex-row md:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters({ q, subject });
          }}
        >
          <label className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name…"
              className="w-full rounded-xl border border-ink-200 py-2.5 pl-10 pr-3 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
            />
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (e.g. mathematics)"
            className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30 md:w-56"
          />
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              applyFilters({ sort: e.target.value });
            }}
            className="w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm md:w-44"
          >
            <option value="ranking_score">Best match</option>
            <option value="rating">Highest rated</option>
            <option value="price">Lowest price</option>
            <option value="newest">Newest</option>
          </select>
          <Button type="submit" variant="gold" size="sm" className="md:shrink-0">
            Search
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOnline(!online);
              applyFilters({ online: !online });
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              online ? "bg-brand-navy text-white" : "bg-ink-100 text-ink-600"
            }`}
          >
            Online
          </button>
          <button
            type="button"
            onClick={() => {
              setInPerson(!inPerson);
              applyFilters({ in_person: !inPerson });
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              inPerson ? "bg-brand-navy text-white" : "bg-ink-100 text-ink-600"
            }`}
          >
            In person
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-ink-500 hover:text-brand-navy"
            onClick={() => {
              setQ("");
              setSubject("");
              setOnline(false);
              setInPerson(false);
              router.push("/tutors", { scroll: false });
            }}
          >
            Clear
          </button>
          <span className="ml-auto text-xs text-ink-500">{query.isLoading ? "Searching…" : `${total} tutor(s)`}</span>
        </div>
      </div>

      {query.isLoading ? (
        <div className="grid gap-2 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <TutorRowSkeleton key={i} />
          ))}
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">
          Could not load tutors. Please try again.
        </div>
      ) : tutors.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No tutors match your filters yet"
          description="New vetted tutors join weekly — try widening your subject or rate filters."
        />
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            {tutors.map((t) => (
              <TutorCard key={t.id} tutor={t} />
            ))}
          </div>
          {query.hasNextPage && (
            <div className="pt-2 text-center">
              <Button variant="outline" onClick={() => void query.fetchNextPage()} disabled={query.isFetchingNextPage}>
                {query.isFetchingNextPage ? "Loading…" : "Load more tutors"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\features\tutors\components\TutorsSearchClient.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/features/tutors/components/TutorsSearchClient.tsx'

New-Item -ItemType Directory -Force -Path 'client\app\(marketing)\tutors' | Out-Null
$content = @'
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { TutorsSearchClient } from "@/features/tutors/components/TutorsSearchClient";
import { TutorRowSkeleton } from "@/components/ui/skeleton";

export const revalidate = 60;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const s = searchParams;
  const filterCount = [
    s.subject, s.online, s.in_person, s.min_price, s.max_price, s.location,
  ].filter((v) => v !== undefined && v !== "").length;

  // Thin filter combos (noindex) vs. core indexable pages (AGENTS.md SEO rule).
  if (filterCount >= 2) {
    return buildMetadata({
      title: "Find Tutors — Filtered Search",
      description: "Filtered tutor search on NUVORA.",
      path: "/tutors",
      noIndex: true,
    });
  }
  return buildMetadata({
    title: "Find Private Tutors Online — Vetted & Verified | NUVORA",
    description:
      "Search NUVORA's vetted private tutors for British & Nigerian curricula, WAEC, NECO, JAMB, IGCSE, A-Level and IELTS preparation. ID-verified, background-checked, escrow-protected.",
    path: "/tutors",
  });
}

export default async function TutorsPage(props: Props) {
  const searchParams = await props.searchParams;
  const subject = typeof searchParams.subject === "string" ? searchParams.subject : undefined;
  const marketplaceEnabled = process.env.NEXT_PUBLIC_MARKETPLACE_ENABLED !== "false";

  return (
    <main>
      <PageHero
        title="Find your perfect tutor"
        subtitle="Every tutor on NUVORA is identity-verified, background-checked and assessed for subject competency. Payments are held in escrow until your lessons are delivered."
        crumbs={[{ name: "Home", href: "/" }, { name: "Tutors" }]}
        align="left"
        image={{ src: "/hero/home-tutoring.jpg", alt: "Tutor working with a student at home" }}
      />
      <div className="container-x pt-12 pb-16">
        {!marketplaceEnabled && (
          <div className="mb-8 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-5 text-sm text-ink-700">
            <strong>Managed matching mode:</strong> tell us what your learner needs and our
            advisors will match a vetted tutor —{" "}
            <a href="/private-tuition" className="font-semibold text-brand-blue hover:underline">request a tutor</a>.
          </div>
        )}
        <Suspense
          fallback={
            <div className="grid gap-2 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <TutorRowSkeleton key={i} />
              ))}
            </div>
          }
        >
          <TutorsSearchClient initialSubject={subject} />
        </Suspense>
      </div>
    </main>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\app\(marketing)\tutors\page.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/app/(marketing)/tutors/page.tsx'

New-Item -ItemType Directory -Force -Path 'client\components\layout' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ChevronDown, Menu, X, GraduationCap, BookOpen, MonitorPlay, Star, ArrowRight } from "lucide-react";
import { AuthNav } from "@/components/layout/AuthNav";
import { useSession } from "@/hooks/useSession";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

// NUVORA header — clean Preline-style: brand · inline links · Services
// mega-menu (grouped + customer story) · divider · Sign in · Get started.

const SERVICE_GROUPS = [
  {
    title: "K-12 Academics",
    icon: <GraduationCap size={15} />,
    items: [
      { label: "Home Tutoring", href: "/hometutors" },
      { label: "Group Cohorts", href: "/cohorts" },
      { label: "British Curriculum", href: "/curricula/british" },
      { label: "Nigerian Curriculum", href: "/curricula/nigerian" },
    ],
  },
  {
    title: "Tests & Exams",
    icon: <BookOpen size={15} />,
    items: [
      { label: "UTME 2026 Prep", href: "/utme-2026" },
      { label: "GMAT Prep", href: "/gmat" },
      { label: "Test Prep Hub", href: "/test-prep" },
      { label: "Entrance Exams", href: "/entrance-exam" },
    ],
  },
  {
    title: "Training & Digital",
    icon: <MonitorPlay size={15} />,
    items: [
      { label: "Online Classes", href: "/online-classes" },
      { label: "Digital Skills", href: "/digital-skills" },
      { label: "Study Abroad", href: "/study-abroad" },
    ],
  },
  {
    title: "Premium & More",
    icon: <Star size={15} />,
    items: [
      { label: "NUVORA Plus", href: "/nuvora-plus" },
      { label: "Pricing", href: "/pricing" },
      { label: "Programmes", href: "/programmes" },
      { label: "Subjects", href: "/subjects" },
    ],
  },
];

const NAV_LINKS = [
  { label: "Programmes", href: "/programmes" },
  { label: "Cohorts", href: "/cohorts" },
  { label: "Tutors", href: "/tutors" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
];

export function Header() {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  const closeAll = () => {
    setServicesOpen(false);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-ink-200 bg-white dark:border-[#214c37] dark:bg-[#0d1f16]">
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-6 py-3 md:px-10">
        {/* Brand */}
        <Link href="/" onClick={closeAll} className="flex-none" aria-label="NUVORA home">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={closeAll}
              className="rounded-lg p-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              {l.label}
            </Link>
          ))}

          {/* Services mega-menu */}
          <div className="relative">
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className={cn(
                "flex items-center gap-1 rounded-lg p-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900",
                servicesOpen && "bg-ink-100"
              )}
              aria-haspopup="menu"
              aria-expanded={servicesOpen}
            >
              Services
              <ChevronDown size={14} className={cn("transition-transform duration-300", servicesOpen && "rotate-180")} />
            </button>

            {servicesOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 w-[min(92vw,700px)] overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg sm:left-auto sm:right-0">
                <div className="grid grid-cols-1 sm:grid-cols-4">
                  {/* Groups */}
                  <div className="grid grid-cols-1 gap-0.5 p-3 sm:col-span-3 sm:grid-cols-2">
                    {SERVICE_GROUPS.map((g) => (
                      <div key={g.title} className="p-2">
                        <span className="ms-2.5 mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-500">
                          {g.title}
                        </span>
                        {g.items.map((it) => (
                          <Link
                            key={it.label}
                            href={it.href}
                            onClick={closeAll}
                            className="flex items-center gap-3 rounded-lg p-2 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-100"
                          >
                            <span className="shrink-0 text-brand-gold-dark">{g.icon}</span>
                            {it.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Promo column — customer stories (no fabricated quotes) */}
                  <div className="flex flex-col bg-ink-50 p-4 sm:col-span-1">
                    <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                      Parent stories
                    </span>
                    <img
                      src="/hero/home-tutoring.jpg"
                      alt="Student learning with a NUVORA tutor"
                      className="h-24 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                    <p className="mt-3 text-sm leading-relaxed text-ink-700">
                      Real families, real results — read parent stories published with explicit consent.
                    </p>
                    <a
                      href="/success-stories"
                      onClick={closeAll}
                      className="mt-3 inline-flex items-center gap-x-1 text-sm font-bold text-brand-green decoration-2 hover:underline"
                    >
                      Read parent stories
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider + buttons */}
        <div className="hidden items-center gap-1.5 lg:flex">
          <div className="mx-2 h-4 w-px bg-ink-200" aria-hidden="true" />
          <ThemeToggle />
          <LanguageSwitcher />
          <AuthNav />
          {!isLoading && !user && (
            <Link
              href="/onboarding"
              className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-brand-gold-hover"
            >
              Get started
            </Link>
          )}
        </div>

        <ThemeToggle className="lg:hidden" />
        <LanguageSwitcher className="lg:hidden" />
        {/* Search (mobile-accessible) + toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          <form onSubmit={submitSearch} className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="What do you want to learn?"
              className="w-48 rounded-full border border-ink-200 bg-ink-50 py-2 pl-8 pr-3 text-sm outline-none transition-all focus:border-brand-gold focus:bg-white focus:ring-2 focus:ring-brand-gold/30"
            />
          </form>
          <AuthNav />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
            className="relative flex size-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-800 hover:bg-ink-50"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </nav>

      {/* Mobile collapse */}
      {mobileOpen && (
        <div className="max-h-[75vh] overflow-y-auto border-t border-ink-100 bg-white px-6 py-4 lg:hidden">
          <div className="space-y-0.5">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={closeAll} className="block rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:bg-ink-100">
                {l.label}
              </Link>
            ))}
            {SERVICE_GROUPS.map((g) => (
              <div key={g.title} className="pt-2">
                <span className="ms-2 block pb-1 text-xs font-semibold uppercase tracking-wide text-ink-400">{g.title}</span>
                {g.items.map((it) => (
                  <Link key={it.label} href={it.href} onClick={closeAll} className="block rounded-lg px-2 py-2 text-sm font-medium text-ink-800 hover:bg-ink-100">
                    {it.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          {!isLoading && !user && (
            <div className="mt-3 border-t border-ink-100 pt-3">
              <Link
                href="/onboarding"
                onClick={closeAll}
                className="block rounded-lg bg-brand-gold px-4 py-2.5 text-center text-sm font-medium text-ink-900"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\Header.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/Header.tsx'

New-Item -ItemType Directory -Force -Path 'client\components\layout' | Out-Null
$content = @'
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, X } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { unreadCount } from "@/features/messaging/api";
import { cn } from "@/lib/utils";
import { APP_NAV, type AppShellVariant, variantForRoles } from "@/lib/app-nav";
import { LogoutDialog } from "@/components/layout/LogoutDialog";

// AppShell — one chrome system, four role layouts. Sidebar + top bar +
// content. Marketing header stays off these routes (ShellVisibility).

export function AppShell({
  children,
  variant: forced,
}: {
  children: React.ReactNode;
  variant?: AppShellVariant;
}) {
  const { user, isLoading } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const variant = forced ?? variantForRoles(user?.roles ?? []);
  const spec = APP_NAV[variant];

  const unread = useQuery({
    queryKey: ["unread-count"],
    queryFn: unreadCount,
    enabled: !!user,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unreadN = unread.data ?? 0;
  const greeting = user?.first_name?.trim() || user?.email?.split("@")[0] || "there";

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label={`${spec.title} navigation`}>
      <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">{spec.title}</p>
      {spec.items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-brand-gold text-ink-900" : "text-ink-700 hover:bg-ink-100"
            )}
          >
            <Icon size={16} className={active ? "text-ink-900" : "text-brand-navy"} />
            {item.label}
            {item.href === "/notifications" && unreadN > 0 && (
              <span className="ml-auto rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadN}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface-muted dark:bg-[#07140e]">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur dark:border-[#214c37] dark:bg-[#0d1f16]/95">
        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-ink-200 text-ink-700 lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link href={spec.home} className="font-display text-lg font-bold tracking-[0.1em] text-brand-navy">
              NUVORA
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/notifications"
              className="relative rounded-lg border border-ink-200 p-2.5 text-ink-600 hover:bg-ink-50"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadN > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold text-ink-900">
                  {unreadN}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-full border border-ink-200 py-1.5 pl-1.5 pr-3 text-sm font-bold text-ink-800 hover:bg-ink-50 sm:pr-4"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-xs font-extrabold text-white">
                {greeting.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[140px] truncate sm:block">{isLoading ? "…" : greeting}</span>
            </Link>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              aria-label="Log out"
              title="Log out"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1400px] lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-ink-100 bg-white p-4 lg:block">{nav}</aside>

        {open && (
          <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true">
            <button type="button" className="absolute inset-0 bg-ink-900/40" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-16 h-[calc(100vh-4rem)] w-[min(280px,88vw)] overflow-y-auto bg-white p-4 shadow-lift">
              {nav}
            </aside>
          </div>
        )}

        <div className="min-w-0">{children}</div>
      </div>
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </div>
  );
}

export function RoleAwareShell({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'client\components\layout\AppShell.tsx'), $content.Replace("`r`n","`n") + "`n", $utf8)
Write-Host 'wrote client/components/layout/AppShell.tsx'

Write-Host 'Done. git add those files, commit, push. Do not add APPLY88.ps1.'
