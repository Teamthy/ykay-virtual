import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/ui/AppText";
import { colors, radius, spacing } from "@/src/lib/theme";

// LoaderScreen — branded full-screen spinner for auth checks, route loads
// and boot states. Centered brand mark + green spinner on the neutral
// background, safe-area aware. Skeletons remain the in-content pattern.

export function LoaderScreen({ label = "Loading" }: { label?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[styles.root, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <View style={styles.mark}>
        <AppText variant="display" style={styles.wordmark}>
          N
        </AppText>
      </View>
      <ActivityIndicator size="large" color={colors.green} style={styles.spinner} />
      <AppText variant="bodySm" style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy,
    marginBottom: spacing.xs,
  },
  wordmark: {
    color: colors.white,
    fontSize: 26,
  },
  spinner: {
    marginTop: spacing.xs,
  },
  label: {
    color: colors.ink[500],
    textAlign: "center",
  },
});
