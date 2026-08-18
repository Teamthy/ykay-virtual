import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/src/components/ui/Screen";
import { TabLayout } from "@/src/components/TabLayout";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { TabBar } from "@/src/components/TabBar";
import { colors, radius, spacing, type } from "@/src/lib/theme";
import { apiFetch, getMyLessonProgress, type LessonProgress } from "@/src/lib/api";

// NUVORA LMS hub — a premium "my courses" home.
// - Aggregates /me/lessons (the learner's schedule) into course cards.
// - Enriches course titles via /cohorts/{id} (public) so cards read as real
//   programmes rather than raw UUIDs.
// - Watched-video progress is blended from /me/learning/progress (000035).

type Lesson = {
  id: string;
  cohort_id?: string;
  title: string;
  start_at: string;
  timezone: string;
  status: string;
  video_url?: string;
  meeting_url?: string;
};
type Cohort = { id: string; title: string; status: string };
type Course = { cohortId: string; title: string; lessons: Lesson[] };

const PROGRAMME_ICONS = ["📚", "🎓", "✏️", "🧮", "🔬", "🌍", "💻", "📐"];

function courseIcon(index: number) {
  return PROGRAMME_ICONS[index % PROGRAMME_ICONS.length];
}

export default function Lms() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watched, setWatched] = useState<Record<string, LessonProgress>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Learner profile resolves from the bearer session server-side.
      const res = await apiFetch<Lesson[]>("/me/lessons");
      const lessons = res.data ?? [];

      // Group lessons by cohort, preserving schedule order.
      const map = new Map<string, Lesson[]>();
      for (const l of lessons) {
        const cid = l.cohort_id ?? "independent";
        map.set(cid, [...(map.get(cid) ?? []), l]);
      }
      const group = [...map.entries()].map(([cohortId, l]) => ({ cohortId, title: "", lessons: l }));

      // Best-effort course titles from the public cohort endpoint.
      const titles = await Promise.allSettled(
        group.map((g) =>
          g.cohortId === "independent"
            ? Promise.resolve("Independent lessons")
            : apiFetch<Cohort>(`/cohorts/${g.cohortId}`).then((r) => r.data)
        )
      );
      group.forEach((g, i) => {
        const t = titles[i];
        if (t.status === "fulfilled" && typeof t.value !== "string" && t.value?.title) {
          g.title = t.value.title;
        } else {
          g.title = g.cohortId === "independent" ? "Independent lessons" : "Cohort course";
        }
      });

      setCourses(group);

      const prog = await getMyLessonProgress().catch(() => [] as LessonProgress[]);
      setWatched(Object.fromEntries(prog.map((p) => [p.lesson_id, p])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const totalLessons = useMemo(() => courses.reduce((n, c) => n + c.lessons.length, 0), [courses]);
  const watchedCount = useMemo(
    () => courses.flatMap((c) => c.lessons).filter((l) => watched[l.id]?.watched).length,
    [courses, watched]
  );

  return (
    <TabLayout>
    <Screen scroll contentContainerStyle={styles.screen}>
      <ScreenHeader
        eyebrow="LEARNING"
        title="My Courses"
        subtitle="Your programmes, live classes and on-demand lessons — all in one place."
      />

      {/* Summary hero */}
      <Animated.View entering={FadeInDown.delay(80).springify().damping(16)}>
        <LinearGradient
          colors={[colors.navy, colors.navyDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <AppText variant="label" style={styles.heroEyebrow}>
            COURSE OVERVIEW
          </AppText>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <AppText variant="h2" style={styles.heroNum}>
                {courses.length}
              </AppText>
              <AppText style={styles.heroCap}>Courses</AppText>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <AppText variant="h2" style={styles.heroNum}>
                {totalLessons}
              </AppText>
              <AppText style={styles.heroCap}>Lessons</AppText>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <AppText variant="h2" style={styles.heroNum}>
                {watchedCount}
              </AppText>
              <AppText style={styles.heroCap}>Watched</AppText>
            </View>
          </View>
          <AppText style={styles.heroHint}>
            {watchedCount > 0
              ? `${Math.round((watchedCount / Math.max(totalLessons, 1)) * 100)}% of your lessons completed`
              : "Progress syncs here as you watch lessons"}
          </AppText>
        </LinearGradient>
      </Animated.View>

      {/* Body */}
      {loading ? (
        <Animated.View entering={FadeInUp.delay(120)}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.skeleton, { opacity: 1 - i * 0.25 }]} />
          ))}
        </Animated.View>
      ) : error ? (
        <Animated.View entering={FadeInUp.delay(120)} style={styles.stateCard}>
          <AppText style={{ fontSize: 30, textAlign: "center" }}>⚠️</AppText>
          <AppText variant="h3" style={{ textAlign: "center", marginTop: 8 }}>
            Couldn't load your courses
          </AppText>
          <AppText variant="bodySm" style={{ textAlign: "center", color: colors.ink[500], marginTop: 4 }}>
            {error}
          </AppText>
          <Button
            label="Try again"
            variant="dark"
            style={{ marginTop: 16, alignSelf: "center" }}
            onPress={() => void load()}
          />
        </Animated.View>
      ) : courses.length === 0 ? (
        <Animated.View entering={FadeInUp.delay(120).springify().damping(16)} style={styles.stateCard}>
          <AppText style={{ fontSize: 34, textAlign: "center" }}>🌱</AppText>
          <AppText variant="h3" style={{ textAlign: "center", marginTop: 10 }}>
            Your learning journey starts here
          </AppText>
          <AppText
            variant="bodySm"
            style={{ textAlign: "center", color: colors.ink[500], marginTop: 6, lineHeight: 19 }}
          >
            Enrol on a programme and your courses, lessons and progress will appear here.
          </AppText>
          <Button
            label="Browse programmes"
            style={{ marginTop: 18, alignSelf: "center" }}
            onPress={() => router.push("/home")}
          />
        </Animated.View>
      ) : (
        <View style={styles.list}>
          {courses.map((c, i) => {
            const next = c.lessons.find((l) => !watched[l.id]?.watched) ?? c.lessons[0];
            const done = c.lessons.filter((l) => watched[l.id]?.watched).length;
            const pct = Math.round((done / Math.max(c.lessons.length, 1)) * 100);
            return (
              <Animated.View key={c.cohortId} entering={FadeInUp.delay(120 + i * 70).springify().damping(16)}>
                <Card
                  onPress={() =>
                    router.push({ pathname: "/lms/[cohortId]", params: { cohortId: c.cohortId } })
                  }
                  style={styles.courseCard}
                >
                  <View style={styles.courseTop}>
                    <View style={styles.iconTile}>
                      <AppText style={{ fontSize: 24 }}>{courseIcon(i)}</AppText>
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <AppText variant="h3">{c.title}</AppText>
                      <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 2 }}>
                        {c.lessons.length} lesson{c.lessons.length === 1 ? "" : "s"}
                      </AppText>
                    </View>
                    <View style={styles.pill}>
                      <AppText variant="caption" style={styles.pillText}>
                        {pct}%
                      </AppText>
                    </View>
                  </View>

                  {done > 0 && (
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.max(pct, 4)}%` }]} />
                    </View>
                  )}

                  {next && (
                    <View style={styles.nextBlock}>
                      <View style={styles.nextDot} />
                      <View style={{ flex: 1 }}>
                        <AppText variant="label" style={{ fontSize: 11 }}>
                          {done === c.lessons.length ? "COMPLETED · LAST LESSON" : "UP NEXT"}
                        </AppText>
                        <AppText variant="bodySm" style={{ color: colors.ink[800], marginTop: 2 }}>
                          {next.title}
                        </AppText>
                        <AppText variant="caption" style={{ marginTop: 2 }}>
                          {new Date(next.start_at).toLocaleDateString()} ·{" "}
                          {new Date(next.start_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {next.video_url ? " · on-demand 🎬" : next.meeting_url ? " · live 🟢" : ""}
                        </AppText>
                      </View>
                      <AppText style={{ fontSize: 18, color: colors.goldDark }}>›</AppText>
                    </View>
                  )}
                </Card>
              </Animated.View>
            );
          })}
        </View>
      )}

      <View style={styles.tab}>
        <TabBar />
      </View>
    </Screen>
    </TabLayout>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 32 },
  hero: {
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 20,
  },
  heroEyebrow: { color: colors.gold, letterSpacing: 1.2, fontSize: type.caption },
  heroRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  heroStat: { flex: 1, alignItems: "center" },
  heroNum: { color: colors.white, fontSize: 24 },
  heroCap: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
  heroDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.15)" },
  heroHint: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 14, textAlign: "center" },
  list: { gap: 12 },
  courseCard: { padding: 18 },
  courseTop: { flexDirection: "row", alignItems: "center" },
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { color: colors.gold, fontWeight: "800" },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.ink[100],
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: { height: 5, backgroundColor: colors.gold, borderRadius: 3 },
  nextBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
  nextDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginRight: 10 },
  stateCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: "center",
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  skeleton: { height: 96, borderRadius: radius.lg, backgroundColor: colors.ink[100], marginBottom: 12 },
  tab: { marginTop: 24 },
});
