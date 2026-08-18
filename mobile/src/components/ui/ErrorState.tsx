import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { colors, radius, spacing } from "@/src/lib/theme";

// Error state — explains what happened, what the user can do, and how to
// recover (per the UI spec). Includes a retry action.

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this. Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={26} color={colors.danger} />
      </View>
      <AppText variant="h3" style={{ textAlign: "center", marginTop: spacing.sm }}>
        {title}
      </AppText>
      <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: spacing.xs, lineHeight: 19 }}>
        {message}
      </AppText>
      {onRetry ? (
        <View style={{ marginTop: spacing.lg }}>
          <Button label={retryLabel} onPress={onRetry} />
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
    backgroundColor: colors.ink[50],
    alignItems: "center",
    justifyContent: "center",
  },
});
