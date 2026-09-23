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
          DEFAULT: "#D6FF57",
          hover: "#C8F030",
          dark: "#0F2A1A",
          light: "#F9F6ED",
        },

        green: {
          DEFAULT: "#D6FF57",
          hover: "#C8F030",
          dark: "#0F2A1A",
          light: "#F9F6ED",
        },

        deep: {
          DEFAULT: "#0F2A1A",
          light: "#194732",
          dark: "#091D12",
        },

        peach: {
          DEFAULT: "#F9F6ED",
          dark: "#F9F6ED",
        },

        black: "#0F2A1A",
        white: "#FFFFFF",

        /*
         * --------------------------------------------------------
         * TEXT / INK
         * --------------------------------------------------------
         */

        ink: {
          950: "#0F2A1A",
          900: "#0F2A1A",
          800: "#193B28",
          700: "#365449",
          600: "#496759",
          500: "#536B5C",
          400: "#596E61",
          300: "#BBCBB8",
          200: "#D6DFD1",
          100: "#E8EEDF",
          50: "#F9F6ED",
        },

        /*
         * --------------------------------------------------------
         * SURFACES
         * --------------------------------------------------------
         */

        surface: {
          DEFAULT: "#FFFFFF",
          white: "#FFFFFF",
          muted: "#F9F6ED",
          subtle: "#FFFFFF",
          dark: "#0F2A1A",
          black: "#0F2A1A",
        },

        /*
         * --------------------------------------------------------
         * BORDERS
         * --------------------------------------------------------
         */

        border: {
          DEFAULT: "#D6DFD1",
          light: "#E8EEDF",
          dark: "#315B41",
        },

        /*
         * --------------------------------------------------------
         * SEMANTIC COLORS
         * --------------------------------------------------------
         */

        success: {
          DEFAULT: "#0F2A1A",
          light: "#F2FFD2",
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
          DEFAULT: "#0F2A1A",
          light: "#F9F6ED",
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
          green: "#D6FF57",
          "green-hover": "#C8F030",
          "green-dark": "#0F2A1A",
          "green-light": "#F9F6ED",

          "deep-green": "#0F2A1A",
          "deep-green-light": "#194732",
          "deep-green-dark": "#091D12",

          peach: "#F9F6ED",
          "peach-dark": "#F0EDDF",

          black: "#0F2A1A",
          white: "#FFFFFF",

          /*
           * Legacy aliases
           */

          navy: "#0F2A1A",
          "navy-dark": "#091D12",

          blue: "#0F2A1A",
          "blue-dark": "#194732",
          "blue-light": "#F9F6ED",

          gold: "#D6FF57",
          "gold-hover": "#C8F030",
          "gold-dark": "#0F2A1A",
          "gold-light": "#F9F6ED",

          /*
           * Kept only for old components.
           * These should eventually be removed.
           */

          orange: "#D6FF57",
          "orange-light": "#F9F6ED",

          purple: "#0F2A1A",

          "prep-orange": "#D6FF57",
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
        xl: "20px",
        "2xl": "20px",
        "3xl": "20px",
        "4xl": "2rem",
        full: "9999px",
      },

      /* ==========================================================
         BOX SHADOWS
         ========================================================== */

      boxShadow: {
        soft: "0 2px 8px rgba(15, 42, 26, 0.06)",

        card: "0 8px 24px rgba(15, 42, 26, 0.10)",

        lift: "0 16px 40px rgba(15, 42, 26, 0.14)",

        hero: "0 30px 80px rgba(15, 42, 26, 0.18)",

        chip: "var(--shadow-chip)",

        "chip-soft": "var(--shadow-chip-soft)",

        brand: "0 10px 30px rgba(214, 255, 87, 0.28)",

        "brand-lg": "0 20px 50px rgba(214, 255, 87, 0.22)",
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

        "hero-in-2": "heroIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.32s both",

        "hero-in-3": "heroIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.48s both",

        "hero-float": "floatY 5s ease-in-out infinite",

        "hero-float-slow": "floatY 5.6s ease-in-out infinite",

        "rail-marquee": "railMarquee var(--rail-duration,60s) linear infinite",
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
