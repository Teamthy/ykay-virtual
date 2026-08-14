import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Home — standard-LMS hub: session greeting, unread badge, and quick
// access to every learner surface (courses, quizzes, progress, messages,
// notifications, account).

type Me = { id: string; email: string; roles: string[]; first_name?: string };
type Unread = { unread: number };

const internal = [
  { href: "/recommendations", title: "For you", desc: "Cohorts, programmes & tutors picked for you", icon: "✨" },
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
      // session gone — login screen handles it
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.hello}>Welcome back{me?.first_name ? `, ${me.first_name}` : ""} 👋</Text>
      <Text style={styles.sub}>What would you like to do today?</Text>
      <View style={styles.grid}>
        {internal.map((s) => (
          <Link key={s.href} href={s.href} asChild>
            <Pressable style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.icon}>{s.icon}</Text>
                {"badge" in s && s.badge && unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unread}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardDesc}>{s.desc}</Text>
            </Pressable>
          </Link>
        ))}

        <Pressable
          style={styles.card}
          onPress={() => void Linking.openURL("https://app.nuvora.com/cohorts")}
        >
          <View style={styles.cardTop}>
            <Text style={styles.icon}>🎓</Text>
          </View>
          <Text style={styles.cardTitle}>Browse cohorts</Text>
          <Text style={styles.cardDesc}>UTME, IGCSE, WAEC & more</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingTop: 32 },
  hello: { fontSize: 24, fontWeight: "800", color: colors.navy },
  sub: { fontSize: 14, color: colors.ink[500], marginTop: 4, marginBottom: 20 },
  grid: { gap: 12 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E8E4DA", padding: 18 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  icon: { fontSize: 22 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: colors.ink[900], fontSize: 12, fontWeight: "800" },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink[900] },
  cardDesc: { fontSize: 13, color: colors.ink[500], marginTop: 2 },
});
