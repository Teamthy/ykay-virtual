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
        // NUVORA brand system — modern, calm, premium, academic
        brand: {
          navy: "#0A1F44",       // Primary — deep academic navy
          "navy-dark": "#060F26",
          blue: "#1E5EFF",       // Accent — clear digital blue
          "blue-dark": "#1648CC",
          "blue-light": "#E9F0FF",
          gold: "#C9A227",       // Restrained gold for premium highlights
          "gold-dark": "#A8841C",
          "gold-light": "#F7F1DE",
          green: "#0F7938",      // Success
          "green-dark": "#0A5C2A",
        },
        ink: {
          900: "#0B1220",
          800: "#141B2C",
          700: "#2B3448",
          600: "#475069",
          500: "#5D6B84",
          400: "#8794AC",
          300: "#AEB9CE",
          200: "#D3DCEA",
          100: "#E8EEF7",
          50: "#F5F8FD",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#F3F6FB",
          subtle: "#F8FAFE",
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
