import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tuteria-inspired brand system (gold/cream design spec)
        brand: {
          navy: "#0A1F44",       // Dark sections / deep navy
          "navy-dark": "#111111",
          blue: "#2563EB",       // Info blue
          "blue-dark": "#1D4ED8",
          "blue-light": "#EAF1FF",
          gold: "#F4B400",       // PRIMARY — Tuteria gold
          "gold-hover": "#DFA300",
          "gold-dark": "#B98200",
          "gold-light": "#FFF3C4",
          orange: "#ED6D20",
          "orange-light": "#FDF0E8",
          green: "#198754",      // Success
          "green-dark": "#146c43",
          "green-light": "#E8F7EF",
          purple: "#0A033C",     // Prep deep purple (tuteriaprep)
          "prep-orange": "#FF6636",
        },
        ink: {
          900: "#111111",
          800: "#181818",
          700: "#333333",
          600: "#555555",
          500: "#777777",
          400: "#999999",
          300: "#B8B2A6",
          200: "#E8E3D8",       // border
          100: "#F0ECE3",       // border-light
          50: "#F7F5EF",        // muted
        },
        surface: {
          DEFAULT: "#FFFCF5",   // cream background
          muted: "#F7F5EF",
          subtle: "#FFF8E8",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "DM Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        body: ["var(--font-body)", "DM Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "Anton", "system-ui", "sans-serif"],
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
        "brand": "0 10px 30px rgba(244,180,0,0.25)",
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
