import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { TabBar } from "@/src/components/TabBar";
import { colors } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";
import { TabBar } from "@/src/components/TabBar";

type Me = { id: string; email: string; roles: string[]; first_name?: string };
type Unread = { unread: number };

const internal = [
  { href: "/lms", title: "My Learning", desc: "Lessons, resources, assignments", icon: "📚" },
  { href: "/quizzes", title: "Quizzes", desc: "Auto-graded assessments", icon: "📝" },
  { href: "/progress", title: "Progress", desc: "Attendance + tutor reports", icon: "📈" },
  { href: "/chat", title: "Chat with Nuvora", desc: "AI assistant + human handoff", icon: "💬" },
  { href: "/notifications", title: "Notifications", desc: "Reminders and updates", icon: "🔔", badge: true },
  { href: "/account", title: "Account", desc: "Profile, learners, logout", icon: "👤" },
] as const;

export default function Home() {
  const [me, setMe] = useState<Me | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const m = await apiFetch<Me>("/auth/me").catch(() => ({ data: null }));
      setMe(m.data);
      const u = await apiFetch<Unread>("/me/notifications/unread-count").catch(() => ({ data: { unread: 0 } }));
      setUnread(u.data?.unread ?? 0);
    } catch {
      // session gone — login handles it
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const greeting = me?.first_name?.trim() || "there";

  return (
    <Screen scroll>
      <Animated.View entering={FadeInDown.delay(80).springify().damping(16)}>
        <AppText variant="h1">Welcome back, {greeting}</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 4, marginBottom: 22 }}>
          What would you like to do today?
        </AppText>
      </Animated.View>

      <View style={styles.grid}>
        {internal.map((s, i) => (
          <Animated.View key={s.href} entering={FadeInUp.delay(120 + i * 60).springify().damping(16)}>
            <Card onPress={() => router.push(s.href as never)} style={styles.card}>
              <View style={styles.cardTop}>
                <AppText style={{ fontSize: 26 }}>{s.icon}</AppText>
                {"badge" in s && s.badge && unread > 0 && (
                  <View style={styles.badge}>
                    <AppText variant="caption" style={{ color: colors.ink[900], fontWeight: "800" }}>
                      {unread}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText variant="h3" style={{ marginTop: 8 }}>
                {s.title}
              </AppText>
              <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 2 }}>
                {s.desc}
              </AppText>
            </Card>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInUp.delay(120 + internal.length * 60).springify().damping(16)}>
          <Card onPress={() => void Linking.openURL("https://app.nuvora.com/cohorts")} style={styles.card}>
            <AppText style={{ fontSize: 26 }}>🎓</AppText>
            <AppText variant="h3" style={{ marginTop: 8 }}>
              Browse cohorts
            </AppText>
            <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 2 }}>
              UTME, IGCSE, WAEC & more
            </AppText>
          </Card>
        </Animated.View>
      </View>

      <View style={styles.tab}>
        <TabBar />
      </View>
<<<<<<< ours

      <TabBar />
    </ScrollView>
=======
    </Screen>
>>>>>>> theirs
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  card: { padding: 18 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  tab: { marginTop: 24 },
});
