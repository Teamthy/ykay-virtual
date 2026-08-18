import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/src/components/ui/AppText";
import { Button } from "@/src/components/ui/Button";
import { colors, radius, spacing } from "@/src/lib/theme";
import { fetchUpdate, applyUpdate } from "@/src/lib/updates";

// In-app update prompt — when a new JS bundle is available (published via
// `eas update`), show a slim banner so the user can apply it on their own
// terms. Non-intrusive; dismissible.

export function UpdateBanner() {
  const [state, setState] = useState<"idle" | "available" | "restarting">("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { available, downloaded } = await fetchUpdate();
      if (!cancelled && available && downloaded) setState("available");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "available") {
    return (
      <View style={styles.banner}>
        <Ionicons name="cloud-download-outline" size={18} color={colors.navy} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <AppText variant="bodySm" style={{ color: colors.navy, fontWeight: "700" }}>
            New update ready
          </AppText>
          <AppText variant="caption" style={{ color: colors.ink[600], marginTop: 1 }}>
            Restart to get the latest features.
          </AppText>
        </View>
        <Button label="Restart" variant="dark" style={{ paddingVertical: 6, paddingHorizontal: 14, minHeight: 32 }} onPress={() => { setState("restarting"); void applyUpdate(); }} />
        <Ionicons name="close" size={18} color={colors.ink[400]} onPress={() => setState("idle")} accessibilityLabel="Dismiss" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.greenLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
});
