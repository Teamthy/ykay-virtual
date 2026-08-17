import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // NUVORA brand system — green / deep-green / black / peach
        brand: {
          navy: "#013920",       // deep green (dark sections, headings)
          "navy-dark": "#002A18",
          blue: "#013920",       // links / accents → deep green
          "blue-dark": "#0A4D32",
          "blue-light": "#DFFFF2",
          gold: "#70F250",       // PRIMARY — brand green
          "gold-hover": "#5FE63F",
          "gold-dark": "#4CCB31",
          "gold-light": "#DFFFF2",
          orange: "#ED6D20",
          "orange-light": "#FDF0E8",
          green: "#4CCB31",      // Success
          "green-dark": "#2F9E26",
          "green-light": "#E6FFDE",
          purple: "#013920",
          "prep-orange": "#70F250",
        },
        ink: {
          900: "#111111",
          800: "#181818",
          700: "#333333",
          600: "#555555",
          500: "#6B6B6B",       // ≥4.5:1 on cream/white (WCAG AA body text)
          400: "#737373",       // ≥4.5:1 on cream/white (WCAG AA secondary)
          300: "#B8B2A6",
          200: "#E8E3D8",       // border
          100: "#F0ECE3",       // border-light
          50: "#F7F5EF",        // muted
        },
        surface: {
          DEFAULT: "#FFF7E4",   // peach background
          muted: "#F8EBCF",
          subtle: "#FFF7E4",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "DM Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        body: ["var(--font-body)", "DM Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Anton", "system-ui", "sans-serif"],
        poppins: ["var(--font-poppins)", "Poppins", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["56px", { lineHeight: "1.1", letterSpacing: "-1.5px", fontWeight: "800" }],
        "display-lg": ["48px", { lineHeight: "1.15", letterSpacing: "-1.2px", fontWeight: "800" }],
        "display-md": ["40px", { lineHeight: "1.2", letterSpacing: "-1px", fontWeight: "800" }],
        "display-sm": ["32px", { lineHeight: "1.25", letterSpacing: "-0.8px", fontWeight: "700" }],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        "soft": "0 2px 8px rgba(0,0,0,0.06)",
        "card": "0 8px 24px rgba(0,0,0,0.08)",
        "lift": "0 16px 40px rgba(0,0,0,0.10)",
        "hero": "0 30px 80px rgba(0,0,0,0.15)",
        "brand": "0 10px 30px rgba(112,242,80,0.28)",
      },
      animation: {
        "slide-down": "slideDown 0.25s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",
      },
      keyframes: {
        slideDown: {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
