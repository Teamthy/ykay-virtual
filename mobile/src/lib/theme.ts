// NUVORA Mobile — premium design system tokens.
// Single source of truth for colour, typography, spacing, radius, elevation.
// Design principles (per the mobile UI spec):
//   - Minimalist, light neutral surfaces with green as the primary accent
//   - Small, consistent radii set: 8 / 12 / 16 / 20 / pill
//   - Extremely subtle elevation hierarchy (flat -> border -> soft shadow)
//   - Clean typography with strong hierarchy
//   - Consistent spacing scale (4/8/12/16/20/24/32/48)
//   - iOS-quality polish, safe-area aware, Android-compatible

// ── Brand / accent palette ────────────────────────────────────────────────
// Primary = green. A small, intentional set — no random accent colours.
export const palette = {
  green: "#16A34A",      // primary accent (actions, emphasis)
  greenDark: "#15803D",  // pressed / active
  greenLight: "#DCFCE7", // tint backgrounds / selected
  navy: "#0F2E1E",       // deep green-ink for headings / text-on-light
  navyDark: "#0A2216",
  ink: "#1A1A1A",        // near-black text on light
  white: "#FFFFFF",
  // Neutrals (light, warm-leaning for a premium feel)
  bg: "#FAFAF7",         // app background (light neutral)
  surface: "#FFFFFF",    // cards / sheets
  surfaceAlt: "#F4F4F1", // subtle section background
  border: "#ECEBE6",     // hairline borders
  danger: "#DC2626",
  success: "#16A34A",
  warning: "#D97706",
} as const;

export const ink = {
  900: "#1A1A1A",
  800: "#2B2B2B",
  700: "#3F3F3F",
  600: "#555555",
  500: "#6E6E6E",
  400: "#8A8A8A",
  300: "#AFAFAF",
  200: "#D8D8D3",
  100: "#ECEBE6",
  50: "#F4F4F1",
} as const;

export const colors = {
  ...palette,
  ink,
  // ── Backward-compatible aliases (existing screens) ─────────────────────
  // Map legacy names to the refined tokens so nothing breaks during the
  // design-system migration. New code should use the tokens above.
  gold: palette.green,        // legacy primary accent
  goldHover: palette.greenDark,
  goldDark: palette.greenDark,
  goldLight: palette.greenLight,
  cream: palette.bg,          // legacy light background
  creamAlt: palette.surfaceAlt,
  surface: palette.surface,   // card surface (now white)
  navy: palette.navy,
  navyDark: palette.navyDark,
} as const;

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
    shadowColor: "#0A2216",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  // Slightly stronger for interactive / raised elements.
  md: {
    shadowColor: "#0A2216",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  // Elevated modal / bottom sheet.
  lg: {
    shadowColor: "#0A2216",
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
