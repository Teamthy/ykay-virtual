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
import { ErrorState } from "@/src/components/ui/ErrorState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing, type } from "@/src/lib/theme";
import { apiFetch, getMyLessonProgress, type LessonProgress } from "@/src/lib/api";

// NUVORA LMS hub — a premium "my courses" home, role-aware:
//   - STUDENT: aggregates /me/lessons into course cards (schedule + progress).
//   - TUTOR: shows the cohorts they teach via /me/tutor-lessons.
//   - Other roles: an intentional empty state with a CTA (never a dead end).
// Watched-video progress is blended from /me/learning/progress (000035).

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
type Me = { id: string; email: string; roles: string[]; first_name?: string };

const PROGRAMME_ICONS = ["📚", "🎓", "✏️", "🧮", "🔬", "🌍", "💻", "📐"];

function courseIcon(index: number) {
  return PROGRAMME_ICONS[index % PROGRAMME_ICONS.length];
}

export default function Lms() {
  const { colors } = useTheme();
  const [role, setRole] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watched, setWatched] = useState<Record<string, LessonProgress>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await apiFetch<Me>("/auth/me").catch(() => ({ data: { id: "", email: "", roles: [] as string[] } }));
      const roles = me.data.roles ?? [];
      const isTutor = roles.includes("TUTOR");
      const isStudent = roles.includes("STUDENT");
      setRole(isTutor ? "TUTOR" : isStudent ? "STUDENT" : "OTHER");

      if (!isTutor && !isStudent) {
        setCourses([]);
        return;
      }

      // Role-aware lessons: tutors read their teaching schedule, learners
      // their enrolled lessons (the student-only endpoint used to 403 for
      // tutors — that's what "can't load your courses" was).
      const lessonsRes = await apiFetch<Lesson[]>(isTutor ? "/me/tutor-lessons" : "/me/lessons");
      const lessons = lessonsRes.data ?? [];

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

      if (isStudent) {
        const prog = await getMyLessonProgress().catch(() => [] as LessonProgress[]);
        setWatched(Object.fromEntries(prog.map((p) => [p.lesson_id, p])));
      }
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
          subtitle={
            role === "TUTOR"
              ? "The cohorts you teach — live classes and on-demand lessons."
              : "Your programmes, live classes and on-demand lessons — all in one place."
          }
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
              {role === "TUTOR" ? "TEACHING OVERVIEW" : "COURSE OVERVIEW"}
            </AppText>
            <View style={styles.heroRow}>
              <View style={styles.heroStat}>
                <AppText variant="h2" style={styles.heroNum}>
                  {courses.length}
                </AppText>
                <AppText style={styles.heroCap}>{role === "TUTOR" ? "Cohorts" : "Courses"}</AppText>
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
              {role === "TUTOR"
                ? "Track every cohort from one hub"
                : watchedCount > 0
                  ? `${Math.round((watchedCount / Math.max(totalLessons, 1)) * 100)}% of your lessons completed`
                  : "Progress syncs here as you watch lessons"}
            </AppText>
          </LinearGradient>
        </Animated.View>

        {/* Body */}
        {loading ? (
          <Animated.View entering={FadeInUp.delay(120)}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeleton}>
                <Skeleton height={96} />
              </View>
            ))}
          </Animated.View>
        ) : error ? (
          <Animated.View entering={FadeInUp.delay(120)}>
            <ErrorState title="Couldn't load your courses" message={error} onRetry={() => void load()} />
          </Animated.View>
        ) : courses.length === 0 ? (
          <Animated.View entering={FadeInUp.delay(120).springify().damping(16)} style={styles.stateCard}>
            {role === "TUTOR" ? (
              <EmptyState
                icon="book-outline"
                title="No cohorts assigned yet"
                description="When a cohort is assigned to you, its schedule and lessons will appear here. Meanwhile you can author practice exams for your learners."
                action={<Button label="Create practice exam" onPress={() => router.push("/tutor/exams" as never)} />}
              />
            ) : role === "OTHER" ? (
              <EmptyState
                icon="school-outline"
                title="Switch to a learner view"
                description="This dashboard shows courses for learners and tutors. Log in with your learner or tutor account to see scheduled lessons here."
                action={<Button label="Browse programmes" onPress={() => router.push("/home" as never)} />}
              />
            ) : (
              <EmptyState
                icon="leaf-outline"
                title="Your learning journey starts here"
                description="Enrol on a programme and your courses, lessons and progress will appear here. You can also warm up with CBT practice exams right now."
                action={
                  <View style={styles.emptyActions}>
                    <Button label="Practice exams" variant="dark" onPress={() => router.push("/practice" as never)} />
                    <Button label="Browse programmes" onPress={() => router.push("/home" as never)} />
                  </View>
                }
              />
            )}
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
                      <View style={[styles.iconTile, { backgroundColor: colors.greenLight }]}>
                        <AppText style={{ fontSize: 24 }}>{courseIcon(i)}</AppText>
                      </View>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <AppText variant="h3">{c.title}</AppText>
                        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 2 }}>
                          {c.lessons.length} lesson{c.lessons.length === 1 ? "" : "s"}
                        </AppText>
                      </View>
                      <View style={[styles.pill, { backgroundColor: colors.greenLight }]}>
                        <AppText variant="caption" style={{ color: colors.greenDark, fontWeight: "800" }}>
                          {pct}%
                        </AppText>
                      </View>
                    </View>

                    {done > 0 && (
                      <View style={[styles.progressTrack, { backgroundColor: colors.ink[100] }]}>
                        <View style={[styles.progressFill, { backgroundColor: colors.greenDark, width: `${Math.max(pct, 4)}%` }]} />
                      </View>
                    )}

                    {next && (
                      <View style={styles.nextBlock}>
                        <View style={[styles.nextDot, { backgroundColor: colors.greenDark }]} />
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
  heroEyebrow: { color: "#70F250", letterSpacing: 1.2, fontSize: type.caption },
  heroRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  heroStat: { flex: 1, alignItems: "flex-start" },
  heroDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.18)" },
  heroNum: { color: "#FFFFFF", fontSize: 26 },
  heroCap: { color: "rgba(255,255,255,0.72)", fontSize: type.caption, marginTop: 2 },
  heroHint: { color: "rgba(255,255,255,0.6)", fontSize: type.caption, marginTop: 14 },
  skeleton: { marginBottom: 14 },
  stateCard: { marginTop: 4 },
  emptyActions: { gap: spacing.sm, marginTop: 4 },
  list: { gap: 14 },
  courseCard: { marginBottom: 0 },
  courseTop: { flexDirection: "row", alignItems: "center" },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  nextBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  nextDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
});
