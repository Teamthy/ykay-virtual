// NUVORA Mobile — premium design system tokens.
// Single source of truth for colour, typography, spacing, radius, elevation.
//
// BRAND ALIGNMENT (B): tokens mirror the web design system (docs/DESIGN_SYSTEM.md)
//   1:1 — primary #70F250 / hover #5FE63F / dark #4CCB31 / light #DFFFF2,
//   deep #013920 (+ light #0A4D32 / dark #002A18), ink scale, semantic
//   colours, and the Anton (display) + DM Sans (body) type pairing.
// Design principles (per the mobile UI spec):
//   - Minimalist, light neutral surfaces with lime-green as the primary accent
//   - Small, consistent radii set: 8 / 12 / 16 / 20 / pill
//   - Extremely subtle elevation hierarchy (flat -> border -> soft shadow)
//   - Clean typography with strong hierarchy (Anton display, DM Sans body)
//   - Consistent spacing scale (4/8/12/16/20/24/32/48)
//   - iOS-quality polish, safe-area aware, Android-compatible

// ── Fonts ─────────────────────────────────────────────────────────────────
// Loaded via @expo-google-fonts (app/_layout.tsx). Anton is a display font —
// use weight 400 only, never 700/800 on Anton.
export const fonts = {
  display: "Anton_400Regular",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodyBold: "DMSans_700Bold",
} as const;

// ── Brand / accent palette ────────────────────────────────────────────────
// Primary = NUVORA lime (#70F250) on deep green (#013920), exactly as the web.
export const palette = {
  green: "#70F250",        // primary accent (actions, emphasis) — web primary.DEFAULT
  greenHover: "#5FE63F",   // pressed / active — web primary.hover
  greenDark: "#4CCB31",    // accessible accent on light surfaces — web primary.dark
  greenLight: "#DFFFF2",   // tint backgrounds / selected — web primary.light
  deep: "#013920",         // brand deep green (headings, dark surfaces) — web deep.DEFAULT
  deepLight: "#0A4D32",    // web deep.light
  deepDark: "#002A18",     // web deep.dark
  peach: "#FFF7E4",        // warm accent surface — web peach.DEFAULT
  white: "#FFFFFF",
  // Neutrals (web ink scale)
  bg: "#F8F7F2",           // app background — web ink.50
  surface: "#FFFFFF",      // cards / sheets
  surfaceAlt: "#EDE8DC",   // subtle section background — web ink.100
  border: "#DCE5DE",       // hairline borders — web border.DEFAULT
  // Semantic (web tokens)
  danger: "#D83A3A",
  success: "#4CCB31",
  warning: "#F4B400",
  info: "#013920",
} as const;

export const ink = {
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
} as const;

export const colors = {
  ...palette,
  ink,
  // ── Backward-compatible aliases (existing screens) ─────────────────────
  // Legacy names map to the web-aligned tokens so every screen re-brands
  // automatically. New code should use the tokens above.
  gold: palette.green,        // legacy primary accent
  goldHover: palette.greenHover,
  goldDark: palette.greenDark,
  goldLight: palette.greenLight,
  cream: palette.bg,          // legacy light background
  creamAlt: palette.surfaceAlt,
  surface: palette.surface,   // card surface (white)
  navy: palette.deep,         // legacy "navy" → brand deep green
  navyDark: palette.deepDark,
} as const;

// ── Dark mode ─────────────────────────────────────────────────────────────
// Same token names as the light theme; surfaces flip to deep-green ink
// neutrals while lime/deep brand colours stay identical. Text on primary
// stays near-black in both modes.
export const darkPalette = {
  green: "#70F250",
  greenHover: "#5FE63F",
  greenDark: "#4CCB31",
  greenLight: "#122A1C",      // dark tint for selected states
  deep: "#013920",
  deepLight: "#0A4D32",
  deepDark: "#002A18",
  peach: "#1C2617",
  white: "#FFFFFF",
  bg: "#0B1310",              // app background (deep neutral)
  surface: "#111D16",         // cards
  surfaceAlt: "#16241B",
  border: "#22362A",
  danger: "#F87171",
  success: "#4CCB31",
  warning: "#F4B400",
  info: "#70F250",
} as const;

export const darkInk = {
  950: "#FFFFFF",
  900: "#F2F6F3",
  800: "#E4ECE7",
  700: "#D2DED6",
  600: "#A9BCAF",
  500: "#8AA093",
  400: "#6E8477",
  300: "#54685C",
  200: "#3A4A40",
  100: "#26342B",
  50: "#182219",
} as const;

export const darkColors = {
  ...darkPalette,
  ink: darkInk,
  gold: darkPalette.green,
  goldHover: darkPalette.greenHover,
  goldDark: darkPalette.greenDark,
  goldLight: darkPalette.greenLight,
  cream: darkPalette.bg,
  creamAlt: darkPalette.surfaceAlt,
  surface: darkPalette.surface,
  navy: darkPalette.deep,
  navyDark: darkPalette.deepDark,
} as const;

export type ThemeColors = {
  green: string; greenHover: string; greenDark: string; greenLight: string;
  deep: string; deepLight: string; deepDark: string; peach: string; white: string;
  bg: string; surface: string; surfaceAlt: string; border: string;
  danger: string; success: string; warning: string; info: string;
  ink: Record<keyof typeof ink, string>;
  gold: string; goldHover: string; goldDark: string; goldLight: string;
  cream: string; creamAlt: string; navy: string; navyDark: string;
};

// ── Typography ────────────────────────────────────────────────────────────
// Display/heading/body/label/caption hierarchy. Sizes in pt.
export const type = {
  display: { "3xl": 34, "2xl": 28, xl: 24, lg: 21, md: 18 },
  title: 18,
  heading: 16,
  body: 15,
  bodySm: 13,
  label: 12,
  caption: 11,
} as const;

// Line-height scale (multiplier) for comfortable reading.
export const lineHeight = { tight: 1.15, normal: 1.4, relaxed: 1.6 } as const;

// ── Spacing scale ─────────────────────────────────────────────────────────
// 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 — use only these values.
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

// ── Radius scale ──────────────────────────────────────────────────────────
// Small: 8 · Medium: 12 · Large: 16 · XL: 20 · Pill: 999
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

// ── Elevation hierarchy ───────────────────────────────────────────────────
// Flat surface -> subtle border -> very soft shadow -> elevated modal.
// Keep opacities low; never heavy shadows.
export const shadow = {
  none: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  // Very soft shadow for resting cards.
  sm: {
    shadowColor: "#002A18",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  // Slightly stronger for interactive / raised elements.
  md: {
    shadowColor: "#002A18",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  // Elevated modal / bottom sheet.
  lg: {
    shadowColor: "#002A18",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
} as const;

export type ShadowKey = keyof typeof shadow;

// ── Layout ────────────────────────────────────────────────────────────────
// Shared screen padding. Safe-area is handled at screen level.
export const layout = {
  pagePadding: 20,       // horizontal screen margin
  cardPadding: 16,       // inner card padding
  sectionGap: 24,        // vertical gap between sections
  listGap: 12,           // vertical gap between list items
  buttonGap: 12,         // gap between stacked buttons
  contentMaxWidth: 560,
  // Recommended touch target (min 44pt).
  touchTarget: 44,
} as const;
