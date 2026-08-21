import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { spacing } from "@/src/lib/theme";

// LoaderScreen — branded full-screen spinner for auth checks, route loads
// and boot states. Centered web brand mark + spinner on the neutral
// background, safe-area aware. Skeletons remain the in-content pattern.

export function LoaderScreen({ label = "Loading" }: { label?: string }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <Image source={require("@/assets/images/logo-mark.png")} style={styles.mark} resizeMode="contain" />
      <ActivityIndicator size="large" color={colors.greenDark} style={styles.spinner} />
      <AppText variant="bodySm" style={[styles.label, { color: colors.ink[500] }]}>
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
    gap: spacing.md,
  },
  mark: {
    width: 64,
    height: 64,
    marginBottom: spacing.xs,
  },
  spinner: {
    marginTop: spacing.xs,
  },
  label: {
    textAlign: "center",
  },
});
