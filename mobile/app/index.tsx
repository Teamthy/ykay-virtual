import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/ui/AppText";
import { OnboardingCarousel } from "@/src/components/OnboardingCarousel";
import { LoaderScreen } from "@/src/components/ui/LoaderScreen";
import { colors, spacing } from "@/src/lib/theme";
import { apiFetch, getToken } from "@/src/lib/api";

// Premium splash + onboarding — session-aware. Logged-in users route to their
// dashboard; logged-out users see the light brand mark + onboarding carousel.

type Me = { id: string; email: string; roles: string[]; onboarded: boolean };

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const token = await getToken();
          if (!token) return;
          const res = await apiFetch<Me>("/auth/me");
          if (cancelled) return;
          const u = res.data;
          if (!u.onboarded) {
            router.replace("/wizard");
            return;
          }
          router.replace(u.roles.includes("STUDENT") ? "/lms" : "/home");
        } catch {
          // no valid session
        } finally {
          if (!cancelled) setChecking(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    void getToken().then((t) => {
      if (!t) setChecking(false);
    });
  }, []);

  if (checking) {
    return <LoaderScreen label="Preparing NUVORA" />;
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.brand}>
        <View style={styles.monogram}>
          <AppText style={{ color: colors.white, fontWeight: "900", fontSize: 24 }}>N</AppText>
        </View>
        <AppText style={styles.brandName}>NUVORA</AppText>
      </View>
      <OnboardingCarousel />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  brand: { alignItems: "center", paddingTop: spacing.xs },
  monogram: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { color: colors.navy, fontWeight: "900", fontSize: 18, letterSpacing: 3, marginTop: spacing.xs },
});
