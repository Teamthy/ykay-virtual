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
        // Tuteria brand system (v2.tuteria.com palette + prep orange)
        brand: {
          navy: "#194F82",       // Primary — Tuteria navy blue
          "navy-dark": "#001028",
          blue: "#056FD2",       // Bright blue accent
          "blue-dark": "#044e94",
          "blue-light": "#E6F0FA",
          sky: "#56ACE0",
          gold: "#FFC10D",       // Gold accent (ratings)
          "gold-dark": "#d9a400",
          "gold-light": "#FFF8E6",
          orange: "#ED6D20",     // Secondary accent
          "orange-light": "#FDF0E8",
          green: "#009A49",      // Success
          "green-dark": "#007a3a",
          "green-light": "#F2F9EE",
          purple: "#0A033C",     // Prep deep purple (tuteriaprep)
          "prep-orange": "#FF6636",
        },
        ink: {
          900: "#001028",
          800: "#1A202C",
          700: "#2D3748",
          600: "#4A5568",
          500: "#718096",
          400: "#98A2B3",
          300: "#CBD5E0",
          200: "#E3E7ED",
          100: "#EDF2F7",
          50: "#F7FAFC",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#F5F8FC",
          subtle: "#FAFCFE",
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
        "soft": "0 4px 20px rgba(0,0,0,0.04)",
        "card": "0 8px 30px rgba(0,0,0,0.06)",
        "lift": "0 20px 50px rgba(0,0,0,0.10)",
        "hero": "0 30px 80px rgba(0,0,0,0.15)",
        "brand": "0 10px 30px rgba(26,79,212,0.25)",
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
