import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { TabLayout } from "@/src/components/TabLayout";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { colors as lightColors } from "@/src/lib/theme";
import {
  formatLessonTime,
  formatNaira,
  getTutorEarnings,
  getTutorLessons,
  type TutorEarnings,
  type TutorLesson,
} from "@/src/lib/tutor";

// Tutor dashboard — earnings snapshot, upcoming lessons and tool shortcuts.
// Mirrors the web tutor dashboard using the same /me endpoints.

const LINKS = [
  { href: "/tutor/earnings", label: "Earnings", icon: "wallet-outline", desc: "Escrow & payouts" },
  { href: "/tutor/lessons", label: "Lessons", icon: "book-outline", desc: "Upcoming & past" },
  { href: "/tutor/schedule", label: "Schedule", icon: "calendar-outline", desc: "This week" },
  { href: "/tutor/messages", label: "Messages", icon: "chatbubbles-outline", desc: "Parents & learners" },
  { href: "/tutor/exams", label: "Exams", icon: "document-text-outline", desc: "Author CBT papers" },
  { href: "/tutor/availability", label: "Availability", icon: "time-outline", desc: "Teaching hours" },
  { href: "/tutor/profile", label: "Profile", icon: "person-outline", desc: "Vetting & subjects" },
] as const;

type IconName = keyof typeof Ionicons.glyphMap;

export default function TutorDashboard() {
  const { colors } = useTheme();
  const [earnings, setEarnings] = useState<TutorEarnings | null>(null);
  const [upcoming, setUpcoming] = useState<TutorLesson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [e, lessons] = await Promise.all([
        getTutorEarnings().catch(() => null),
        getTutorLessons().catch(() => [] as TutorLesson[]),
      ]);
      setEarnings(e);
      const now = Date.now();
      setUpcoming(
        lessons
          .filter((l) => new Date(l.start_at).getTime() >= now)
          .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
          .slice(0, 3)
      );
    } catch {
      // session handled elsewhere
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <TabLayout>
      <Screen scroll>
        <ScreenHeader
          eyebrow="Tutor workspace"
          title="Your teaching hub"
          subtitle="Earnings, schedule and learners at a glance."
        />

      <View style={styles.statRow}>
        {[
          { label: "Held", value: earnings?.held_total, color: colors.deep },
          { label: "Released", value: earnings?.released_total, color: colors.deepLight },
          { label: "Paid out", value: earnings?.paid_total, color: colors.greenDark },
        ].map((s) => (
          <Card key={s.label} padded style={styles.statCard}>
            <AppText variant="caption" style={{ color: colors.ink[400] }}>
              {s.label.toUpperCase()}
            </AppText>
            <AppText variant="h3" style={{ color: s.color, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
              {loading ? "—" : formatNaira(s.value ?? 0)}
            </AppText>
          </Card>
        ))}
      </View>

      <AppText variant="label" style={styles.sectionTitle}>
        UPCOMING LESSONS
      </AppText>
      {upcoming.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No upcoming lessons yet — they appear here once a learner books you.
          </AppText>
        </Card>
      ) : (
        upcoming.map((l) => (
          <Card key={l.id} padded style={styles.lessonCard}>
            <AppText variant="h3">{l.title}</AppText>
            <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
              {formatLessonTime(l.start_at)}
            </AppText>
          </Card>
        ))
      )}

      <AppText variant="label" style={styles.sectionTitle}>
        TOOLS
      </AppText>
        <View style={styles.grid}>
          {LINKS.map((l) => (
            <Card key={l.href} onPress={() => router.push(l.href as never)} padded style={styles.linkCard}>
              <Ionicons name={l.icon as IconName} size={22} color={colors.navy} />
              <AppText variant="h3" style={{ marginTop: 8 }}>
                {l.label}
              </AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                {l.desc}
              </AppText>
            </Card>
          ))}
        </View>
      </Screen>
    </TabLayout>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1 },
  sectionTitle: { color: lightColors.goldDark, letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  lessonCard: { marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  linkCard: { width: "48%", flexGrow: 1 },
});
