import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { TabLayout } from "@/src/components/TabLayout";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { Button } from "@/src/components/ui/Button";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { colors as lightColors, fonts, radius, spacing, type } from "@/src/lib/theme";
import { listTutorExams } from "@/src/lib/api";
import {
  formatLessonTime,
  formatNaira,
  getTutorEarnings,
  getTutorLessons,
  type TutorEarnings,
  type TutorLesson,
} from "@/src/lib/tutor";

// Tutor hub — the teaching command center (docs/MOBILE_DASHBOARD_DIRECTION.md).
// Dominant fact: AVAILABLE BALANCE (escrow you can withdraw). Home owns
// "today's schedule"; this hub owns money + teaching pipeline:
//   hero (balance) → metrics (this week · exams · held · paid out) →
//   quick actions (create exam + tiles) → upcoming lessons → tools.

const LINKS = [
  { href: "/tutor/schedule", label: "Schedule", icon: "calendar-outline", desc: "This week's classes" },
  { href: "/tutor/messages", label: "Messages", icon: "chatbubbles-outline", desc: "Parents & learners" },
  { href: "/tutor/exams", label: "Exams", icon: "document-text-outline", desc: "Author CBT papers" },
  { href: "/tutor/availability", label: "Availability", icon: "time-outline", desc: "Teaching hours" },
  { href: "/tutor/profile", label: "Profile", icon: "person-outline", desc: "Vetting & subjects" },
  { href: "/tutor/earnings", label: "Earnings", icon: "wallet-outline", desc: "Escrow & payouts" },
] as const;

type IconName = keyof typeof Ionicons.glyphMap;

export default function TutorDashboard() {
  const { colors } = useTheme();
  const [earnings, setEarnings] = useState<TutorEarnings | null>(null);
  const [upcoming, setUpcoming] = useState<TutorLesson[]>([]);
  const [exams, setExams] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [e, lessons, ex] = await Promise.all([
        getTutorEarnings().catch(() => null),
        getTutorLessons().catch(() => [] as TutorLesson[]),
        listTutorExams().catch(() => []),
      ]);
      setEarnings(e);
      setExams(ex.length);
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

  const weekCount = useMemo(() => upcoming.length, [upcoming]);

  if (loading) {
    return (
      <TabLayout>
        <Screen scroll>
          <Skeleton height={150} />
          <View style={styles.metricGrid}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={76} style={{ flex: 1 }} />
            ))}
          </View>
          <Skeleton height={48} style={{ marginTop: spacing.lg }} />
          <Skeleton height={72} style={{ marginTop: spacing.sm }} />
          <Skeleton height={72} style={{ marginTop: spacing.xs }} />
        </Screen>
      </TabLayout>
    );
  }

  return (
    <TabLayout>
      <Screen scroll>
        <ScreenHeader
          eyebrow="TUTOR WORKSPACE"
          title="Your teaching hub"
          subtitle="Money, schedule and learners at a glance."
        />

        {/* B. Primary card — available balance (dominant) */}
        <Animated.View entering={FadeInDown.delay(80).springify().damping(16)}>
          <LinearGradient
            colors={[colors.navy, colors.navyDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <AppText variant="label" style={styles.heroEyebrow}>
              AVAILABLE BALANCE
            </AppText>
            <AppText variant="display" style={styles.heroAmount}>
              {earnings ? formatNaira(earnings.released_total) : "₦0"}
            </AppText>
            <View style={styles.heroSubRow}>
              <AppText style={styles.heroCap}>Held {earnings ? formatNaira(earnings.held_total) : "₦0"}</AppText>
              <View style={styles.heroDot} />
              <AppText style={styles.heroCap}>Paid out {earnings ? formatNaira(earnings.paid_total) : "₦0"}</AppText>
            </View>
            <View style={styles.heroActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/tutor/earnings" as never)}
                style={[styles.heroCta, { backgroundColor: colors.green }]}
              >
                <AppText style={{ color: colors.ink[950], fontFamily: fonts.bodyBold, fontWeight: "700" }}>View earnings</AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/tutor/exams/new" as never)}
                style={[styles.heroGhost, { borderColor: "rgba(255,255,255,0.28)" }]}
              >
                <AppText style={{ color: colors.white }}>Create exam</AppText>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* C. Key metrics */}
        <Animated.View entering={FadeInUp.delay(140).springify().damping(16)} style={styles.metricGrid}>
          {[
            { label: "THIS WEEK", value: String(weekCount), href: "/tutor/schedule" },
            { label: "EXAMS", value: String(exams), href: "/tutor/exams" },
            { label: "HELD", value: earnings ? formatNaira(earnings.held_total) : "₦0", href: "/tutor/earnings" },
            { label: "PAID OUT", value: earnings ? formatNaira(earnings.paid_total) : "₦0", href: "/tutor/earnings" },
          ].map((m) => (
            <Card key={m.label} onPress={() => router.push(m.href as never)} padded style={styles.metricCard}>
              <AppText variant="caption" style={{ color: colors.ink[400], letterSpacing: 0.8 }}>
                {m.label}
              </AppText>
              <AppText variant="h2" style={{ color: colors.deep, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>
                {m.value}
              </AppText>
            </Card>
          ))}
        </Animated.View>

        {/* D. Quick actions */}
        <Animated.View entering={FadeInUp.delay(180).springify().damping(16)}>
          <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
            QUICK ACTIONS
          </AppText>
          <Button label="Create exam" full onPress={() => router.push("/tutor/exams/new" as never)} />
          <View style={styles.tiles}>
            {[
              { href: "/tutor/schedule", label: "Schedule", icon: "calendar-outline" },
              { href: "/tutor/messages", label: "Messages", icon: "chatbubbles-outline" },
              { href: "/tutor/availability", label: "Availability", icon: "time-outline" },
              { href: "/tutor/exams", label: "Exams", icon: "document-text-outline" },
            ].map((t) => (
              <Card key={t.href} onPress={() => router.push(t.href as never)} padded style={styles.tileCard}>
                <Ionicons name={t.icon as IconName} size={22} color={colors.deep} />
                <AppText variant="label" style={{ marginTop: spacing.xs, color: colors.ink[700], textAlign: "center" }}>
                  {t.label}
                </AppText>
              </Card>
            ))}
          </View>
        </Animated.View>

        {/* E. Upcoming lessons */}
        <Animated.View entering={FadeInUp.delay(220).springify().damping(16)}>
          <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
            UPCOMING LESSONS
          </AppText>
          {upcoming.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No lessons scheduled"
              description="Once learners book you, upcoming sessions appear here. Keep your availability current so parents can find free slots."
              action={<Button label="Set availability" onPress={() => router.push("/tutor/availability" as never)} />}
            />
          ) : (
            <View style={styles.activity}>
              {upcoming.map((l) => (
                <Card key={l.id} onPress={() => router.push("/tutor/schedule" as never)} style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: colors.greenLight }]}>
                    <Ionicons name="videocam-outline" size={16} color={colors.deep} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <AppText variant="heading" numberOfLines={1}>
                      {l.title}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                      {formatLessonTime(l.start_at)}
                    </AppText>
                  </View>
                  <View style={[styles.chip, { backgroundColor: colors.greenLight }]}>
                    <AppText variant="caption" style={{ color: colors.greenDark }}>
                      {l.meeting_url ? "LIVE" : "CLASS"}
                    </AppText>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </Animated.View>

        {/* F. Tools */}
        <Animated.View entering={FadeInUp.delay(260).springify().damping(16)}>
          <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
            TOOLS
          </AppText>
          <View style={styles.grid}>
            {LINKS.map((l) => (
              <Card key={l.href} onPress={() => router.push(l.href as never)} padded style={styles.linkCard}>
                <Ionicons name={l.icon as IconName} size={22} color={colors.deep} />
                <AppText variant="h3" style={{ marginTop: 8 }}>
                  {l.label}
                </AppText>
                <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                  {l.desc}
                </AppText>
              </Card>
            ))}
          </View>
        </Animated.View>
      </Screen>
    </TabLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroEyebrow: { color: "#70F250", letterSpacing: 1.4, fontSize: type.caption },
  heroAmount: { color: "#FFFFFF", fontSize: 40, marginTop: spacing.xs },
  heroSubRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap" },
  heroCap: { color: "rgba(255,255,255,0.72)", fontSize: type.bodySm },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  heroActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  heroCta: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  heroGhost: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  metricCard: { flexGrow: 1, flexBasis: "46%", maxWidth: "48.5%" },
  section: { color: lightColors.goldDark, letterSpacing: 1.1, fontSize: type.caption, marginTop: spacing.sm, marginBottom: spacing.sm },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  tileCard: { flexGrow: 1, flexBasis: "22%", alignItems: "center", paddingVertical: spacing.md },
  activity: { gap: spacing.sm },
  activityRow: { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: { paddingHorizontal: spacing.xs, paddingVertical: 3, borderRadius: radius.pill },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  linkCard: { width: "48%", flexGrow: 1 },
});
