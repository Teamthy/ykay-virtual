import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { TabLayout } from "@/src/components/TabLayout";
import { Button } from "@/src/components/ui/Button";
import { useTheme } from "@/src/lib/theme-context";
import { colors as lightColors } from "@/src/lib/theme";
import { apiFetch, getToken } from "@/src/lib/api";
import { Ionicons } from "@expo/vector-icons";

type Me = { id: string; email: string; roles: string[]; first_name?: string };
type Unread = { unread: number };

const internal = [
  { href: "/lms", title: "My Learning", desc: "Lessons, resources, assignments", icon: "book-outline" },
  { href: "/practice", title: "Practice exams", desc: "Timed CBT tests — JAMB style", icon: "timer-outline" },
  { href: "/quizzes", title: "Quizzes", desc: "Auto-graded assessments", icon: "create-outline" },
  { href: "/progress", title: "Progress", desc: "Attendance + tutor reports", icon: "stats-chart-outline" },
  { href: "/subjects", title: "Subjects", desc: "Browse the full catalogue", icon: "library-outline" },
  { href: "/exam-prep", title: "Exam prep", desc: "WAEC, NECO, JAMB, IGCSE", icon: "school-outline" },
  { href: "/search", title: "Find a tutor", desc: "Search vetted tutors", icon: "search-outline" },
  { href: "/saved", title: "Saved tutors", desc: "Your wishlist", icon: "heart-outline" },
  { href: "/chat", title: "Chat with Nuvora", desc: "AI assistant + human handoff", icon: "chatbubbles-outline" },
  { href: "/messages", title: "Messages", desc: "Tutors, parents & learners", icon: "mail-outline" },
  { href: "/my-lessons", title: "My lessons", desc: "Upcoming & past sessions", icon: "calendar-outline" },
  { href: "/notifications", title: "Notifications", desc: "Reminders and updates", icon: "notifications-outline", badge: true },
  { href: "/account", title: "Account", desc: "Profile, learners, logout", icon: "person-outline" },
] as const;

export default function Home() {
  const { colors } = useTheme();
  const [me, setMe] = useState<Me | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      // No session token → skip the auth endpoints entirely (Expo Go preview
      // and logged-out browsing); show the signed-out greeting instead.
      const token = await getToken();
      if (!token) {
        setMe(null);
        return;
      }
      const m = await apiFetch<Me>("/auth/me").catch(() => ({ data: null }));
      setMe(m.data);
      const u = await apiFetch<Unread>("/me/notifications/unread-count").catch(() => ({ data: { unread: 0 } }));
      setUnread(u.data?.unread ?? 0);
    } catch {
      // session gone — login handles it
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const signedOut = !me;
  const greeting = me?.first_name?.trim() || "there";

  return (
    <TabLayout>
    <Screen scroll>
      <Animated.View entering={FadeInDown.delay(80).springify().damping(16)}>
        <AppText variant="h1">{signedOut ? "Welcome to NUVORA" : `Welcome back, ${greeting}`}</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 4, marginBottom: 22 }}>
          {signedOut ? "Log in to see your classes, payments and progress." : "What would you like to do today?"}
        </AppText>
        {signedOut && (
          <Card style={{ marginBottom: 20 }}>
            <Button label="Log in" full onPress={() => router.push("/login" as never)} />
          </Card>
        )}
      </Animated.View>

      {me?.roles?.includes("TUTOR") && (
        <Card onPress={() => router.push("/tutor" as never)} style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <Ionicons name="school-outline" size={22} color={colors.navy} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="h3">Tutor workspace</AppText>
            <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 2 }}>
              Earnings, schedule, lessons, messages & exams
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.goldDark} />
        </Card>
      )}

      <View style={styles.grid}>
        {internal.map((s, i) => (
          <Animated.View key={s.href} entering={FadeInUp.delay(120 + i * 60).springify().damping(16)}>
            <Card onPress={() => router.push(s.href as never)} style={styles.card}>
              <View style={styles.cardTop}>
                <Ionicons name={s.icon} size={26} color={colors.navy} />
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
            <Ionicons name="people-outline" size={26} color={colors.navy} />
            <AppText variant="h3" style={{ marginTop: 8 }}>
              Browse cohorts
            </AppText>
            <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 2 }}>
              UTME, IGCSE, WAEC & more
            </AppText>
          </Card>
        </Animated.View>
      </View>

    </Screen>
    </TabLayout>
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
    backgroundColor: lightColors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
});
