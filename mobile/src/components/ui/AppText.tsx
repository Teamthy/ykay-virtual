import { Text, type TextProps, type TextStyle } from "react-native";
import { colors, type } from "@/src/lib/theme";

// Typography primitive — consistent weight/size/color defaults with overrides.

type Variant = "display" | "h1" | "h2" | "h3" | "body" | "bodySm" | "label" | "caption";

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontSize: type.display["3xl"], fontWeight: "800", color: colors.navy, letterSpacing: -0.5 },
  h1: { fontSize: type.display.xl, fontWeight: "800", color: colors.navy, letterSpacing: -0.4 },
  h2: { fontSize: type.display.lg, fontWeight: "700", color: colors.navy },
  h3: { fontSize: type.display.md, fontWeight: "700", color: colors.navy },
  body: { fontSize: type.body, color: colors.ink[700], lineHeight: 22 },
  bodySm: { fontSize: type.bodySm, color: colors.ink[600], lineHeight: 19 },
  label: { fontSize: type.label, fontWeight: "700", color: colors.ink[800] },
  caption: { fontSize: type.caption, color: colors.ink[400] },
};

type Props = TextProps & { variant?: Variant };

export function AppText({ variant = "body", style, ...rest }: Props) {
  return <Text style={[VARIANTS[variant], style]} {...rest} />;
}
