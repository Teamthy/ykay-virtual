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
        // YKAY brand system - academic, calm, premium
        brand: {
          navy: "#0a2472",       // Primary deep navy
          blue: "#1a4fd4",       // Digital blue
          "blue-dark": "#1a3fb0",
          "blue-light": "#e8f0ff",
          gold: "#ffd400",       // Restrained gold accent
          "gold-dark": "#e6bf00",
          green: "#0f7938",      // Success / premium
          "green-dark": "#0a5c2a",
        },
        ink: {
          900: "#0a0e27",
          800: "#1a1a2e",
          700: "#333333",
          600: "#555555",
          500: "#777777",
          400: "#999999",
          300: "#cccccc",
          200: "#e5e5e5",
          100: "#f5f5f5",
          50: "#fafafa",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f5f7fb",
          subtle: "#fafafa",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Inter", "sans-serif"],
        handwritten: ["Caveat", "Kalam", "cursive"],
        serif: ["Georgia", "serif"],
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
