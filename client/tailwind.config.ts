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
         * YK-Virtual BRAND
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
        display: ["var(--font-display)", "Anton", "system-ui", "sans-serif"],

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

        "hero-in": "heroIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",

        "hero-in-late": "heroIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both",

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
        brand: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },

  plugins: [],
};

export default config;
