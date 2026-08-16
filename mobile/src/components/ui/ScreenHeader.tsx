import { StyleSheet, Text, View } from "react-native";
import { colors, type } from "@/src/lib/theme";

// Premium screen header — eyebrow, title, subtitle. Consistent typography
// hierarchy across every screen.

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function ScreenHeader({ eyebrow, title, subtitle }: Props) {
  return (
    <View style={styles.root}>
      {eyebrow ? (
        <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginBottom: 22 },
  eyebrow: {
    fontSize: type.caption,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: colors.goldDark,
    marginBottom: 6,
  },
  title: {
    fontSize: type.display.xl,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: type.bodySm,
    color: colors.ink[500],
    marginTop: 6,
    lineHeight: 19,
  },
});
