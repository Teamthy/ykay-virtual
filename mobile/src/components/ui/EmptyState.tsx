import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { colors, radius, spacing } from "@/src/lib/theme";

// Empty state — a friendly placeholder for when there is no content yet.
// Always includes an icon, an explanation, and an optional CTA.

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon = "sparkles-outline", title, description, action }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.green} />
      </View>
      <AppText variant="h3" style={{ textAlign: "center", marginTop: spacing.sm }}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: spacing.xs, lineHeight: 19 }}>
          {description}
        </AppText>
      ) : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
