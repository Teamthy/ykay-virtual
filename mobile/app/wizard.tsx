import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { WizardStepper } from "@/src/components/WizardStepper";
import { colors } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";
import { getDraft, setDraft } from "@/src/lib/wizard-draft";

// Wizard step 1 — Welcome. Session-aware: already-onboarded users go straight
// to their home; new users seed their draft and continue to /wizard/profile.

type Me = { id: string; email: string; roles: string[]; onboarded: boolean; first_name?: string };

function roleFor(roles: string[]): string {
  if (roles.includes("PARENT")) return "PARENT";
  if (roles.includes("STUDENT")) return "STUDENT";
  if (roles.includes("TUTOR")) return "TUTOR";
  if (roles.includes("INSTITUTION")) return "INSTITUTION";
  return "OTHER";
}

function roleLabel(role: string): string {
  if (role === "PARENT") return "parent";
  if (role === "STUDENT") return "learner";
  if (role === "TUTOR") return "educator";
  return "member";
}

function midLabel(role: string): string {
  if (role === "PARENT") return "Your learner";
  if (role === "STUDENT") return "Your level";
  return "Your subjects";
}

export default function WizardWelcome() {
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<Me>("/auth/me");
        if (cancelled) return;
        const u = res.data;
        setMe(u);
        if (u.onboarded) {
          router.replace("/home");
          return;
        }
        // Seed the draft once (keep any existing draft so back-navigation
        // never wipes what the user already entered).
        const existing = await getDraft();
        await setDraft({
          ...existing,
          role: existing.role ?? roleFor(u.roles),
          firstName: existing.firstName || u.first_name?.trim() || "",
        });
      } catch {
        router.replace("/login");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const role = roleFor(me?.roles ?? []);

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <Screen scroll>
      <WizardStepper step={0} labels={["Welcome", midLabel(role), "Goals"]} />

      <Animated.View entering={FadeInUp.delay(80).springify().damping(16)}>
        <View style={styles.badge}>
          <Ionicons name="sparkles-outline" size={26} color={colors.ink[900]} />
        </View>
        <AppText variant="h1" style={{ marginTop: 16 }}>
          Welcome{me?.first_name?.trim() ? `, ${me.first_name.trim()}` : ""}
        </AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 8, lineHeight: 20 }}>
          You&apos;re signed in as a {roleLabel(role)}. Two quick steps to personalise your
          dashboard, recommendations and notifications.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(220).springify().damping(16)} style={{ marginTop: 28 }}>
        <Button label="Continue" full onPress={() => router.push("/wizard/profile" as never)} />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
});
