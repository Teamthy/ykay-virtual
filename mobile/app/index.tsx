import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OnboardingCarousel } from "@/src/components/OnboardingCarousel";
import { BrandLogo } from "@/src/components/BrandLogo";
import { LoaderScreen } from "@/src/components/ui/LoaderScreen";
import { useTheme } from "@/src/lib/theme-context";
import { spacing } from "@/src/lib/theme";
import { apiFetch, getToken } from "@/src/lib/api";

// Premium splash + onboarding — session-aware. Logged-in users route to their
// dashboard; logged-out users see the light brand mark + onboarding carousel.

type Me = { id: string; email: string; roles: string[]; onboarded: boolean };

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
    }, []),
  );

  useEffect(() => {
    void getToken().then((t) => {
      if (!t) setChecking(false);
    });
  }, []);

  if (checking) {
    return <LoaderScreen label="Preparing YK-Virtual" />;
  }

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.bg, paddingTop: insets.top + spacing.lg },
      ]}
    >
      <View style={styles.brand}>
        <BrandLogo stacked size={56} />
      </View>
      <OnboardingCarousel />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  brand: { alignItems: "center", paddingTop: spacing.xs },
});
