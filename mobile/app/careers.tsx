import { useMemo } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";

// Careers — mirrors the web /careers page. Honest: the two open roles that
// exist today, how we hire, and speculative applications. No invented jobs.

const VALUES = [
  { icon: "shield-checkmark-outline", title: "Safeguarding first", body: "We serve children, so safety is a product requirement." },
  { icon: "school-outline", title: "Academic standards", body: "Every feature has to earn its place in a real learning journey." },
  { icon: "lock-closed-outline", title: "Honest money", body: "Payments are escrow-protected and fail closed." },
  { icon: "code-slash-outline", title: "Real ownership", body: "A small team shipping across the whole system." },
] as const;

const ROLES = [
  { title: "Full-Stack Engineer (Next.js + Go)", body: "Build across the web client and the Go API — dashboards, bookings, escrow payments and the tutor experience.", tags: ["Next.js", "Go", "PostgreSQL", "Redis"] },
  { title: "Academic Operations Lead", body: "Own programme quality and academic governance — tutor vetting, curriculum pathways and safeguarding.", tags: ["Vetting", "Safeguarding", "Programmes"] },
] as const;

export default function CareersScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Join the team"
        title="Build the school of the future"
        subtitle="NUVORA is a full commercial, SEO-first virtual school — not just a lead-gen site."
      />

      <View style={styles.mission}>
        <AppText style={{ fontSize: 20, fontWeight: "800", color: colors.ink[900] }}>Why work with us</AppText>
        <AppText variant="bodySm" style={{ color: "rgba(0,0,0,0.75)", marginTop: 8, lineHeight: 20 }}>
          We are building a complete virtual school: programmes, cohorts, vetted tutors, assessments
          and progress parents can actually see. Every role here shapes that product directly.
        </AppText>
      </View>

      <AppText variant="label" style={styles.sectionTitle}>WHAT WE VALUE</AppText>
      {VALUES.map((v) => (
        <Card key={v.title} padded style={styles.card}>
          <Ionicons name={v.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.navy} />
          <AppText variant="h3" style={{ marginTop: 8 }}>{v.title}</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 4, lineHeight: 19 }}>{v.body}</AppText>
        </Card>
      ))}

      <AppText variant="label" style={styles.sectionTitle}>OPEN ROLES</AppText>
      {ROLES.map((r) => (
        <Card key={r.title} padded style={styles.card}>
          <AppText variant="h3">{r.title}</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}>{r.body}</AppText>
          <View style={styles.tags}>
            {r.tags.map((t) => (
              <View key={t} style={styles.tag}>
                <AppText variant="caption" style={{ color: colors.ink[600], fontWeight: "700" }}>{t}</AppText>
              </View>
            ))}
          </View>
          <View style={{ height: 10 }} />
          <Button
            label={`Apply — ${r.title}`}
            variant="secondary"
            full
            onPress={() => void Linking.openURL(`mailto:support@nuvora.com?subject=${encodeURIComponent(`Application — ${r.title}`)}`)}
          />
        </Card>
      ))}

      <Card padded style={{ marginTop: 12, borderStyle: "dashed", borderWidth: 1, borderColor: colors.ink[200] }}>
        <AppText variant="h3">Don't see your role?</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}>
          We review speculative applications from strong people. Write to support@nuvora.com with a short
          note about what you would like to build.
        </AppText>
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  mission: { backgroundColor: colors.gold, borderRadius: 20, padding: 24 },
  sectionTitle: { color: colors.goldDark, letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  card: { marginBottom: 10 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { backgroundColor: colors.ink[50], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
