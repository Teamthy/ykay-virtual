import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { colors, radius } from "@/src/lib/theme";

// Welcome screen — the app's landing: brand, value props, CTAs.

export default function Welcome() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.brandRow}>
        <Text style={styles.logo}>NUVORA</Text>
        <Text style={styles.tagline}>LEARNING BEYOND BOUNDARIES</Text>
      </View>

      <Text style={styles.headline}>Tutors, programmes{'\n'}and live cohorts{'\n'}in your pocket.</Text>
      <Text style={styles.sub}>
        British &amp; Nigerian curricula · Exam prep (UTME, IGCSE, SAT, GMAT) · Private tuition.
      </Text>

      <View style={styles.pills}>
        {["👩‍🏫 1,200+ tutors", "🎓 40+ programmes", "💬 AI support 24/7"].map((p) => (
          <View key={p} style={styles.pill}>
            <Text style={styles.pillText}>{p}</Text>
          </View>
        ))}
      </View>

      <Link href="/onboarding" asChild>
        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Create an account</Text>
        </Pressable>
      </Link>
      <Link href="/login" asChild>
        <Pressable style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>I already have an account</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingTop: 64, flexGrow: 1 },
  brandRow: { alignItems: "center", gap: 4 },
  logo: { fontSize: 28, fontWeight: "900", letterSpacing: 4, color: colors.navy },
  tagline: { fontSize: 10, letterSpacing: 3, color: colors.ink[500] },
  headline: { fontSize: 30, fontWeight: "800", color: colors.navy, lineHeight: 38, marginTop: 40 },
  sub: { fontSize: 14, color: colors.ink[600], lineHeight: 21, marginTop: 12 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 20 },
  pill: { backgroundColor: colors.goldLight, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 12, fontWeight: "700", color: colors.navy },
  primaryBtn: {
    marginTop: 40, backgroundColor: colors.gold, borderRadius: radius.md,
    paddingVertical: 16, alignItems: "center",
  },
  primaryText: { color: colors.ink[900], fontWeight: "800", fontSize: 15 },
  secondaryBtn: {
    marginTop: 12, borderWidth: 1, borderColor: colors.ink[400], borderRadius: radius.md,
    paddingVertical: 16, alignItems: "center",
  },
  secondaryText: { color: colors.ink[700], fontWeight: "600", fontSize: 15 },
});
