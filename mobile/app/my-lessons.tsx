import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { Button } from "@/src/components/ui/Button";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, radius, spacing, type } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// My lessons — the week-view command center for scheduled sessions
// (docs/MOBILE_DASHBOARD_DIRECTION.md): THIS WEEK is the dominant fact, the
// next session carries a LIVE/ON-DEMAND chip, and the full schedule splits
// into upcoming and past with notes shortcuts. Role-aware: tutors read
// /me/tutor-lessons, learners /me/lessons.

type Lesson = {
  id: string;
  cohort_id?: string | null;
  title: string;
  start_at: string;
  end_at?: string | null;
  status: string;
  meeting_url?: string | null;
  video_url?: string | null;
};
type Me = { id: string; email: string; roles: string[] };

function fmtDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}
function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export default function MyLessonsScreen() {
  const { colors } = useTheme();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isTutor, setIsTutor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiFetch<Me>("/auth/me").catch(() => ({ data: { id: "", email: "", roles: [] as string[] } }));
      const tutor = (me.data.roles ?? []).includes("TUTOR");
      setIsTutor(tutor);
      const res = await apiFetch<Lesson[]>(tutor ? "/me/tutor-lessons" : "/me/lessons");
      setLessons(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your lessons");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const { week, upcoming, past } = useMemo(() => {
    const now = Date.now();
    const weekEnd = now + 7 * 24 * 3600 * 1000;
    const w = lessons
      .filter((l) => {
        const t = new Date(l.start_at).getTime();
        return t >= now && t < weekEnd;
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    const up = lessons
      .filter((l) => new Date(l.start_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    const p = lessons
      .filter((l) => new Date(l.start_at).getTime() < now)
      .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
    return { week: w, upcoming: up, past: p };
  }, [lessons]);

  const next = upcoming[0];

  const render = (l: Lesson) => (
    <Card key={l.id} padded style={styles.row}>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <AppText variant="h3" style={{ flex: 1 }}>
            {l.title}
          </AppText>
          {l.meeting_url || l.video_url ? (
            <View style={[styles.chip, { backgroundColor: l.meeting_url ? colors.greenLight : colors.ink[100] }]}>
              <AppText variant="caption" style={{ color: l.meeting_url ? colors.greenDark : colors.ink[500], fontWeight: "800" }}>
                {l.meeting_url ? "LIVE" : "ON-DEMAND"}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
          {fmtDay(l.start_at)} · {fmtTime(l.start_at)} · {l.status}
        </AppText>
      </View>
      <Ionicons
        name="document-text-outline"
        size={18}
        color={colors.greenDark}
        accessibilityLabel="Lesson notes"
        onPress={() => router.push(`/lesson-notes/${l.id}` as never)}
      />
    </Card>
  );

  if (loading) {
    return (
      <Screen scroll>
        <Skeleton height={140} />
        <Skeleton height={20} width="40%" style={{ marginTop: spacing.xl }} />
        <Skeleton height={72} style={{ marginTop: spacing.sm }} />
        <Skeleton height={72} style={{ marginTop: spacing.xs }} />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen scroll>
        <ErrorState title="Couldn't load your lessons" message={error} onRetry={() => void load()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow={isTutor ? "TUTOR SCHEDULE" : "MY LEARNING"}
        title="My lessons"
        subtitle={isTutor ? "Every class you teach, this week first." : "Every session assigned to you, this week first."}
      />

      {/* B. Primary card — this week is the dominant fact */}
      <Animated.View entering={FadeIn.delay(80).duration(240)}>
        <LinearGradient colors={[colors.navy, colors.navyDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <AppText variant="label" style={styles.heroEyebrow}>
            THIS WEEK
          </AppText>
          <AppText variant="display" style={styles.heroAmount}>
            {week.length}
          </AppText>
          <View style={styles.heroSubRow}>
            {next ? (
              <>
                <View style={[styles.heroChip, { backgroundColor: next.meeting_url ? "rgba(112,242,80,0.18)" : "rgba(255,255,255,0.12)" }]}>
                  <AppText style={[styles.heroChipText, { color: next.meeting_url ? colors.green : colors.white }]}>
                    NEXT: {fmtDay(next.start_at)} · {fmtTime(next.start_at)}
                  </AppText>
                </View>
              </>
            ) : (
              <AppText style={styles.heroCap}>No sessions in the next 7 days</AppText>
            )}
          </View>
          <View style={styles.heroActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push((next ? "/lms" : "/subjects") as never)}
              style={[styles.heroCta, { backgroundColor: colors.green }]}
            >
              <AppText style={{ color: colors.ink[950], fontFamily: fonts.bodyBold, fontWeight: "700" }}>
                {next ? "View course" : "Browse programmes"}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/practice" as never)}
              style={[styles.heroGhost, { borderColor: "rgba(255,255,255,0.28)" }]}
            >
              <AppText style={{ color: colors.white }}>Practice exam</AppText>
            </Pressable>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Upcoming */}
      <AppText variant="label" style={[styles.sectionTitle, { color: colors.ink[500] }]}>
        UPCOMING
      </AppText>
      {upcoming.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No upcoming lessons"
          description={
            isTutor
              ? "Keep your availability current so parents can book you into new slots."
              : "Enrol on a programme and your scheduled sessions will appear here."
          }
          action={
            isTutor ? (
              <Button label="Set availability" onPress={() => router.push("/tutor/availability" as never)} />
            ) : (
              <Button label="Browse programmes" onPress={() => router.push("/subjects" as never)} />
            )
          }
        />
      ) : (
        upcoming.map(render)
      )}

      {/* Past */}
      <AppText variant="label" style={[styles.sectionTitle, { color: colors.ink[500] }]}>
        PAST
      </AppText>
      {past.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No past lessons yet.
          </AppText>
        </Card>
      ) : (
        past.map(render)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: spacing.lg,
  },
  heroEyebrow: { color: "#70F250", letterSpacing: 1.4, fontSize: type.caption },
  heroAmount: { color: "#FFFFFF", fontSize: 40, marginTop: spacing.xs },
  heroSubRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap" },
  heroCap: { color: "rgba(255,255,255,0.72)", fontSize: type.bodySm },
  heroChip: { paddingHorizontal: spacing.xs, paddingVertical: 3, borderRadius: radius.pill },
  heroChipText: { fontSize: type.caption, fontWeight: "800", letterSpacing: 0.6 },
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
  sectionTitle: { letterSpacing: 1.1, fontSize: type.caption, marginTop: spacing.xl, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  chip: { paddingHorizontal: spacing.xs, paddingVertical: 3, borderRadius: radius.pill },
});
