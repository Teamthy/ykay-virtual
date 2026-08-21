import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, type } from "@/src/lib/theme";

// Premium screen header — eyebrow, title, subtitle. Consistent typography
// hierarchy across every screen. Theme-aware (Anton title, tinted eyebrow).

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ eyebrow, title, subtitle }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: colors.goldDark }]}>{eyebrow.toUpperCase()}</Text>
      ) : null}
      <Text style={[styles.title, { color: colors.navy }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.ink[500] }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 22 },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: type.caption,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.display,
    fontWeight: "400",
    fontSize: type.display.xl,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: type.bodySm,
    marginTop: 6,
    lineHeight: 19,
  },
});
