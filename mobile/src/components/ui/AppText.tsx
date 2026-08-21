import { Text, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, type, type ThemeColors } from "@/src/lib/theme";

// Typography primitive — consistent weight/size/color defaults with overrides.
// Brand pairing: Anton (display/headings, weight 400 only) + DM Sans (body).
// Theme-aware: text colours come from the active theme.

type Variant = "display" | "h1" | "h2" | "h3" | "heading" | "body" | "bodySm" | "label" | "caption";

function variantsFor(colors: ThemeColors): Record<Variant, TextStyle> {
  return {
    display: { fontFamily: fonts.display, fontWeight: "400", fontSize: type.display["3xl"], color: colors.navy, letterSpacing: 0.5 },
    h1: { fontFamily: fonts.display, fontWeight: "400", fontSize: type.display.xl, color: colors.navy, letterSpacing: 0.4 },
    h2: { fontFamily: fonts.display, fontWeight: "400", fontSize: type.display.lg, color: colors.navy, letterSpacing: 0.3 },
    h3: { fontFamily: fonts.display, fontWeight: "400", fontSize: type.display.md, color: colors.navy, letterSpacing: 0.3 },
    heading: { fontFamily: fonts.bodyBold, fontWeight: "700", fontSize: type.heading, color: colors.navy },
    body: { fontFamily: fonts.body, fontSize: type.body, color: colors.ink[700], lineHeight: 22 },
    bodySm: { fontFamily: fonts.body, fontSize: type.bodySm, color: colors.ink[600], lineHeight: 19 },
    label: { fontFamily: fonts.bodyBold, fontWeight: "700", fontSize: type.label, color: colors.ink[800] },
    caption: { fontFamily: fonts.body, fontSize: type.caption, color: colors.ink[400] },
  };
}

type Props = TextProps & { variant?: Variant };

export function AppText({ variant = "body", style, ...rest }: Props) {
  const { colors } = useTheme();
  // Dynamic-type aware: OS font scaling is respected up to 1.4x so layouts
  // stay intact at the largest accessibility sizes.
  return <Text maxFontSizeMultiplier={1.4} style={[variantsFor(colors)[variant], style]} {...rest} />;
}
