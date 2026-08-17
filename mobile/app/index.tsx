import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/src/components/ui/Screen";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { apiFetch, getToken } from "@/src/lib/api";

// Premium welcome — animated entrance, gradient brand, session-aware routing.

type Me = { id: string; email: string; roles: string[]; onboarded: boolean };

export default function Welcome() {
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
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#013920", "#002A18", "#013920"]}
      style={styles.gradient}
    >
      <Screen scroll gradient={["#013920", "#002A18"]} padded>
        <View style={styles.top}>
          <AppText variant="h2" style={{ color: colors.gold, letterSpacing: 4, fontWeight: "900" }}>
            NUVORA
          </AppText>
          <AppText variant="caption" style={{ color: colors.white, opacity: 0.6, letterSpacing: 2 }}>
            LEARNING BEYOND BOUNDARIES
          </AppText>
        </View>

        <View style={styles.hero}>
          <Animated.View entering={FadeInUp.delay(100).springify().damping(16)}>
            <AppText
              variant="display"
              style={{ color: colors.white, lineHeight: 44 }}
            >
              Tutors, programmes{"\n"}and live cohorts{"\n"}
              <AppText variant="display" style={{ color: colors.gold }}>
                in your pocket.
              </AppText>
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(220).springify().damping(16)}>
            <AppText variant="body" style={{ color: colors.white, opacity: 0.75, marginTop: 14, lineHeight: 22 }}>
              British &amp; Nigerian curricula · Exam prep (UTME, IGCSE, SAT, GMAT) · Private tuition.
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(340).springify().damping(16)} style={styles.pills}>
            {["1,200+ tutors", "40+ programmes", "AI support 24/7"].map((p) => (
              <View key={p} style={styles.pill}>
                <AppText variant="label" style={{ color: colors.navy }}>
                  {p}
                </AppText>
              </View>
            ))}
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(460).springify().damping(16)} style={styles.actions}>
          <Button label="Create an account" onPress={() => router.push("/onboarding")} full />
          <Button
            label="I already have an account"
            variant="ghost"
            onPress={() => router.push("/login")}
            full
            style={{ marginTop: 12 }}
          />
        </Animated.View>
      </Screen>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.navy },
  top: { alignItems: "center", gap: 4, marginTop: 12 },
  hero: { flex: 1, justifyContent: "center", marginTop: 40 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20 },
  pill: { backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  actions: { marginTop: 20 },
});
