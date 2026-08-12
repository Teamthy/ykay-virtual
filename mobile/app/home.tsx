import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";

// Home — quick access to the core mobile surfaces (M2 shell; LMS screens land in M3).

const sections = [
  { href: "/chat", title: "Chat with Nuvora", desc: "AI assistant + human handoff", icon: "💬" },
  { href: "https://app.nuvora.com/cohorts", title: "Browse cohorts", desc: "UTME, IGCSE, WAEC & more", icon: "🎓" },
  { href: "https://app.nuvora.com/tutors", title: "Find a tutor", desc: "1,200+ verified experts", icon: "👩‍🏫" },
  { href: "https://app.nuvora.com/lms", title: "My Learning (LMS)", desc: "Lessons, quizzes, grades", icon: "📚" },
] as const;

export default function Home() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.hello}>Welcome back 👋</Text>
      <Text style={styles.sub}>What would you like to do today?</Text>
      <View style={styles.grid}>
        {sections.map((s) => (
          <Link key={s.href} href={s.href} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.icon}>{s.icon}</Text>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardDesc}>{s.desc}</Text>
            </Pressable>
          </Link>
        ))}
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
  icon: { fontSize: 24 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.navy, marginTop: 8 },
  cardDesc: { fontSize: 13, color: colors.ink[500], marginTop: 2 },
});
