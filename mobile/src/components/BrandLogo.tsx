import { Image, StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, spacing } from "@/src/lib/theme";

// BrandLogo — the web logo (deep badge + lime glyph) with the NUVORA
// wordmark set in Anton, exactly as the web lockup. Used on the welcome,
// login, loader and wizard screens so mobile matches the web brand.

type Props = {
  size?: number;          // mark size in pt (wordmark scales with it)
  stacked?: boolean;      // wordmark below the mark (vertical lockup)
  light?: boolean;        // wordmark in white (for deep backgrounds)
};

export function BrandLogo({ size = 44, stacked = false, light = false }: Props) {
  const { colors } = useTheme();
  const word = (
    <AppText
      style={[
        styles.word,
        { fontSize: Math.max(18, Math.round(size * 0.46)), color: light ? colors.white : colors.deep },
      ]}
    >
      NUVORA
    </AppText>
  );

  if (stacked) {
    return (
      <View style={styles.stack}>
        <Image source={require("@/assets/images/logo-mark.png")} style={{ width: size, height: size }} resizeMode="contain" />
        {word}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Image source={require("@/assets/images/logo-mark.png")} style={{ width: size, height: size }} resizeMode="contain" />
      {word}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stack: { alignItems: "center", gap: spacing.xs },
  word: { fontFamily: fonts.display, fontWeight: "400", letterSpacing: 3 },
});
