import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing } from "@/src/lib/theme";

// Confirmation state — restrained success feedback (per the UI spec: "use
// restrained celebration. Avoid excessive confetti or animation."). Shows a
// single check, a short title, a supporting line, and an optional CTA.

type Props = {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
};

export function SuccessState({ title, message, icon = "checkmark", actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      <View style={[styles.iconWrap, { backgroundColor: colors.green }]}>
        <Ionicons name={icon} size={32} color={colors.ink[950]} />
      </View>
      <AppText variant="h3" style={{ textAlign: "center", marginTop: spacing.md }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="bodySm" style={{ textAlign: "center", marginTop: spacing.xs, lineHeight: 19 }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.lg }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
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
    alignItems: "center",
    justifyContent: "center",
  },
});
