// NUVORA Mobile — premium design system tokens.
// A single source of truth for colour, typography, spacing, radius, shadows,
// and elevation so every screen feels intentional and consistent (not "AI-ish").
// Brand: primary green #70F250, deep green #013920, black, peach #FFF7E4,
// white — matching the web tokens (brand-gold / brand-navy / surface).

export const palette = {
  gold: "#70F250",
  goldHover: "#5FE63F",
  goldDark: "#4CCB31",
  goldLight: "#DFFFF2",
  navy: "#013920",
  navyDark: "#002A18",
  cream: "#FFF7E4",
  creamAlt: "#F8EBCF",
  surface: "#FFF7E4",
  white: "#FFFFFF",
  danger: "#DC2626",
  success: "#16A34A",
  warning: "#F59E0B",
} as const;

export const ink = {
  900: "#111111",
  800: "#1C1C1C",
  700: "#333333",
  600: "#4B4B4B",
  500: "#6B6B6B",
  400: "#8E8E8E",
  300: "#B8B8B8",
  200: "#E4E2DA",
  100: "#EFEDE6",
  50: "#F7F6F2",
} as const;

export const colors = {
  ...palette,
  ink,
};

// Typography — a clear display/body hierarchy.
export const type = {
  display: {
    "3xl": 34,
    "2xl": 30,
    xl: 26,
    lg: 22,
    md: 18,
  },
  title: 20,
  body: 15,
  bodySm: 13,
  label: 12,
  caption: 11,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// Shadows — subtle, premium depth for iOS (shadow*) and Android (elevation).
export const shadow = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: "#013920",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#013920",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  lg: {
    shadowColor: "#013920",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    elevation: 9,
  },
} as const;

export type ShadowKey = keyof typeof shadow;

// Shared screen padding (with safe-area handled at the screen level).
export const layout = {
  pagePadding: 20,
  contentMaxWidth: 560,
} as const;
