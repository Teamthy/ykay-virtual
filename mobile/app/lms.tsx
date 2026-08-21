import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
import { fonts, radius, spacing, type } from "@/src/lib/theme";
import { apiFetch, getMyLessonProgress, listMyAttempts, listTutorExams, type LessonProgress, type PracticeAttemptItem } from "@/src/lib/api";
import { formatLessonTime, getTutorLessons, type TutorLesson } from "@/src/lib/tutor";

// LMS hub — the learning command center (docs/MOBILE_DASHBOARD_DIRECTION.md):
//   learner: overall progress hero (dominant) → metrics → quick actions →
//            recent attempts → course cards
//   tutor:   teaching overview hero (cohorts dominant) → metrics → quick
//            actions → cohort cards
//   other:   intentional empty state with a CTA (never a dead end).

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

function fmtDay(t: string): string {
  return new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(t: string): string {
  return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Lms() {
  const { colors } = useTheme();
  const [role, setRole] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watched, setWatched] = useState<Record<string, LessonProgress>>({});
  const [attempts, setAttempts] = useState<PracticeAttemptItem[]>([]);
  const [exams, setExams] = useState(0);
  const [tutorLessons, setTutorLessons] = useState<TutorLesson[]>([]);

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
      // their enrolled lessons.
      if (isTutor) {
        const [ls, ex] = await Promise.all([
          getTutorLessons().catch(() => [] as TutorLesson[]),
          listTutorExams().catch(() => []),
        ]);
        setTutorLessons(ls);
        setExams(ex.length);
        // Group by cohort for the course cards.
        const map = new Map<string, TutorLesson[]>();
        for (const l of ls) {
          const cid = l.cohort_id ?? "independent";
          map.set(cid, [...(map.get(cid) ?? []), l]);
        }
        const group = [...map.entries()].map(([cohortId, ls]) => ({
          cohortId,
          title: "",
          lessons: ls.map((l) => ({ id: l.id, cohort_id: l.cohort_id ?? undefined, title: l.title, start_at: l.start_at, timezone: l.timezone, status: "SCHEDULED", video_url: l.video_url ?? undefined, meeting_url: l.meeting_url ?? undefined })),
        }));
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
        return;
      }

      // learner
      const [lessonsRes, prog, at] = await Promise.all([
        apiFetch<Lesson[]>("/me/lessons"),
        getMyLessonProgress().catch(() => [] as LessonProgress[]),
        listMyAttempts().catch(() => [] as PracticeAttemptItem[]),
      ]);
      const lessons = lessonsRes.data ?? [];
      setWatched(Object.fromEntries(prog.map((p) => [p.lesson_id, p])));
      setAttempts(at);

      const map = new Map<string, Lesson[]>();
      for (const l of lessons) {
        const cid = l.cohort_id ?? "independent";
        map.set(cid, [...(map.get(cid) ?? []), l]);
      }
      const group = [...map.entries()].map(([cohortId, l]) => ({ cohortId, title: "", lessons: l }));
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  // ---- derived ----
  const totalLessons = useMemo(() => courses.reduce((n, c) => n + c.lessons.length, 0), [courses]);
  const watchedCount = useMemo(
    () => courses.flatMap((c) => c.lessons).filter((l) => watched[l.id]?.watched).length,
    [courses, watched]
  );
  const watchedPct = totalLessons > 0 ? Math.round((watchedCount / totalLessons) * 100) : 0;
  const upcoming = useMemo(
    () =>
      courses
        .flatMap((c) => c.lessons)
        .filter((l) => new Date(l.start_at).getTime() >= Date.now())
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [courses]
  );
  const next = upcoming[0];
  const submitted = attempts.filter((a) => a.submitted_at);
  const avgScore = submitted.length > 0 ? Math.round(submitted.reduce((n, a) => n + (a.score ?? 0), 0) / submitted.length) : null;
  const isTutor = role === "TUTOR";
  const weekLessons = useMemo(
    () => tutorLessons.filter((l) => {
      const t = new Date(l.start_at).getTime();
      return t >= Date.now() && t < Date.now() + 7 * 24 * 3600 * 1000;
    }).length,
    [tutorLessons]
  );

  return (
    <TabLayout>
      <Screen scroll contentContainerStyle={styles.screen}>
        <ScreenHeader
          eyebrow="LEARNING"
          title="My Courses"
          subtitle={
            isTutor
              ? "The cohorts you teach — live classes and on-demand lessons."
              : "Your programmes, live classes and on-demand lessons — all in one place."
          }
        />

        {/* B. Primary card — one dominant fact per role */}
        <Animated.View entering={FadeIn.delay(80).duration(240)}>
          <LinearGradient
            colors={[colors.navy, colors.navyDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            {isTutor ? (
              <>
                <AppText variant="label" style={styles.heroEyebrow}>
                  TEACHING OVERVIEW
                </AppText>
                <AppText variant="display" style={styles.heroAmount}>
                  {courses.length}
                </AppText>
                <View style={styles.heroSubRow}>
                  <AppText style={styles.heroCap}>cohort{courses.length === 1 ? "" : "s"} · {totalLessons} lessons this term</AppText>
                </View>
                <View style={styles.heroActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/tutor/exams/new" as never)}
                    style={[styles.heroCta, { backgroundColor: colors.green }]}
                  >
                    <AppText style={{ color: colors.ink[950], fontFamily: fonts.bodyBold, fontWeight: "700" }}>Create exam</AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push("/tutor/schedule" as never)}
                    style={[styles.heroGhost, { borderColor: "rgba(255,255,255,0.28)" }]}
                  >
                    <AppText style={{ color: colors.white }}>View schedule</AppText>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <AppText variant="label" style={styles.heroEyebrow}>
                  OVERALL PROGRESS
                </AppText>
                <AppText variant="display" style={styles.heroAmount}>
                  {totalLessons > 0 ? `${watchedPct}%` : "—"}
                </AppText>
                {totalLessons > 0 ? (
                  <>
                    <View style={styles.heroProgressTrack}>
                      <View style={[styles.heroProgressFill, { backgroundColor: colors.green, width: `${Math.max(watchedPct, 4)}%` }]} />
                    </View>
                    <View style={styles.heroSubRow}>
                      <AppText style={styles.heroCap}>
                        {watchedCount} of {totalLessons} lessons watched
                      </AppText>
                      {next && (
                        <>
                          <View style={styles.heroDot} />
                          <View style={[styles.heroChip, { backgroundColor: next.meeting_url ? "rgba(112,242,80,0.18)" : "rgba(255,255,255,0.12)" }]}>
                            <AppText style={[styles.heroChipText, { color: next.meeting_url ? colors.green : colors.white }]}>
                              NEXT: {fmtDay(next.start_at)} · {fmtTime(next.start_at)}
                            </AppText>
                          </View>
                        </>
                      )}
                    </View>
                  </>
                ) : (
                  <View style={styles.heroSubRow}>
                    <AppText style={styles.heroCap}>Enrol on a programme and your progress starts here.</AppText>
                  </View>
                )}
                <View style={styles.heroActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push((next ? "/lms" : "/subjects") as never)}
                    style={[styles.heroCta, { backgroundColor: colors.green }]}
                  >
                    <AppText style={{ color: colors.ink[950], fontFamily: fonts.bodyBold, fontWeight: "700" }}>
                      {next ? "View courses" : "Browse programmes"}
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
              </>
            )}
          </LinearGradient>
        </Animated.View>

        {/* C. Key metrics */}
        {role !== "OTHER" && (
          <Animated.View entering={FadeIn.delay(140).duration(240)} style={styles.metricGrid}>
            {(isTutor
              ? [
                  { label: "THIS WEEK", value: String(weekLessons), href: "/tutor/schedule" },
                  { label: "LESSONS", value: String(totalLessons), href: "/lms" },
                  { label: "EXAMS", value: String(exams), href: "/tutor/exams" },
                  { label: "COHORTS", value: String(courses.length), href: "/lms" },
                ]
              : [
                  { label: "COURSES", value: String(courses.length), href: "/lms" },
                  { label: "LESSONS", value: String(totalLessons), href: "/lms" },
                  { label: "WATCHED", value: `${watchedPct}%`, href: "/lms" },
                  { label: "PRACTICE AVG", value: avgScore === null ? "—" : `${avgScore}%`, href: "/practice" },
                ]
            ).map((m) => (
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
        )}

        {/* D. Quick actions */}
        {role !== "OTHER" && (
          <Animated.View entering={FadeIn.delay(180).duration(240)}>
            <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
              QUICK ACTIONS
            </AppText>
            {isTutor ? (
              <Button label="Create exam" full onPress={() => router.push("/tutor/exams/new" as never)} />
            ) : (
              <Button label="Take a practice exam" full onPress={() => router.push("/practice" as never)} />
            )}
            <View style={styles.tiles}>
              {(isTutor
                ? [
                    { href: "/tutor/schedule", label: "Schedule", icon: "calendar-outline" },
                    { href: "/tutor/messages", label: "Messages", icon: "chatbubbles-outline" },
                    { href: "/tutor/earnings", label: "Earnings", icon: "wallet-outline" },
                    { href: "/tutor/exams", label: "Exams", icon: "document-text-outline" },
                  ]
                : [
                    { href: "/quizzes", label: "Quizzes", icon: "create-outline" },
                    { href: "/progress", label: "Progress", icon: "stats-chart-outline" },
                    { href: "/messages", label: "Messages", icon: "mail-outline" },
                    { href: "/search", label: "Find a tutor", icon: "search-outline" },
                  ]
              ).map((t) => (
                <Card key={t.href} onPress={() => router.push(t.href as never)} padded style={styles.tileCard}>
                  <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.deep} />
                  <AppText variant="label" style={{ marginTop: spacing.xs, color: colors.ink[700], textAlign: "center" }}>
                    {t.label}
                  </AppText>
                </Card>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Body: loading / error / empty / courses */}
        {loading ? (
          <Animated.View entering={FadeIn.delay(120).duration(240)} style={{ marginTop: spacing.lg }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={96} style={{ marginBottom: spacing.md }} />
            ))}
          </Animated.View>
        ) : error ? (
          <Animated.View entering={FadeIn.delay(120).duration(240)}>
            <ErrorState title="Couldn't load your courses" message={error} onRetry={() => void load()} />
          </Animated.View>
        ) : courses.length === 0 ? (
          <Animated.View entering={FadeIn.delay(120).duration(240)} style={styles.stateCard}>
            {isTutor ? (
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
          <>
            {/* E. Recent attempts (learner) */}
            {!isTutor && submitted.length > 0 && (
              <Animated.View entering={FadeIn.delay(200).duration(240)}>
                <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
                  RECENT ATTEMPTS
                </AppText>
                <View style={styles.activity}>
                  {submitted.slice(0, 2).map((a) => (
                    <Card key={a.attempt_id} onPress={() => router.push("/practice" as never)} style={styles.activityRow}>
                      <View style={[styles.activityIcon, { backgroundColor: a.passed ? colors.greenLight : colors.ink[100] }]}>
                        <Ionicons name="timer-outline" size={16} color={a.passed ? colors.greenDark : colors.danger} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <AppText variant="heading" numberOfLines={1}>
                          {a.exam_title}
                        </AppText>
                        <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                          {a.exam_subject} · {a.submitted_at ? fmtDay(a.submitted_at) : ""}
                        </AppText>
                      </View>
                      <View style={[styles.chip, { backgroundColor: a.passed ? colors.greenLight : colors.ink[100] }]}>
                        <AppText variant="caption" style={{ color: a.passed ? colors.greenDark : colors.danger, fontWeight: "800" }}>
                          {a.score}% {a.passed ? "PASS" : "FAIL"}
                        </AppText>
                      </View>
                    </Card>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* F. Course cards */}
            <Animated.View entering={FadeIn.delay(220).duration(240)}>
              <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
                {isTutor ? "MY COHORTS" : "MY COURSES"}
              </AppText>
              <View style={styles.list}>
                {courses.map((c, i) => {
                  const nextL = c.lessons.find((l) => !watched[l.id]?.watched) ?? c.lessons[0];
                  const done = c.lessons.filter((l) => watched[l.id]?.watched).length;
                  const pct = Math.round((done / Math.max(c.lessons.length, 1)) * 100);
                  return (
                    <Animated.View key={c.cohortId} entering={FadeIn.delay(120 + i * 70).duration(240)}>
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
                              {isTutor ? "ACTIVE" : `${pct}%`}
                            </AppText>
                          </View>
                        </View>

                        {!isTutor && done > 0 && (
                          <View style={[styles.progressTrack, { backgroundColor: colors.ink[100] }]}>
                            <View style={[styles.progressFill, { backgroundColor: colors.greenDark, width: `${Math.max(pct, 4)}%` }]} />
                          </View>
                        )}

                        {nextL && (
                          <View style={styles.nextBlock}>
                            <View style={[styles.nextDot, { backgroundColor: colors.greenDark }]} />
                            <View style={{ flex: 1 }}>
                              <AppText variant="label" style={{ fontSize: 11 }}>
                                {!isTutor && done === c.lessons.length ? "COMPLETED · LAST LESSON" : isTutor ? "NEXT CLASS" : "UP NEXT"}
                              </AppText>
                              <AppText variant="bodySm" style={{ color: colors.ink[800], marginTop: 2 }}>
                                {nextL.title}
                              </AppText>
                              <AppText variant="caption" style={{ marginTop: 2 }}>
                                {fmtDay(nextL.start_at)} · {fmtTime(nextL.start_at)}
                                {nextL.video_url ? " · on-demand 🎬" : nextL.meeting_url ? " · live 🟢" : ""}
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
            </Animated.View>
          </>
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
    marginBottom: spacing.lg,
  },
  heroEyebrow: { color: "#70F250", letterSpacing: 1.4, fontSize: type.caption },
  heroAmount: { color: "#FFFFFF", fontSize: 40, marginTop: spacing.xs },
  heroSubRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap" },
  heroCap: { color: "rgba(255,255,255,0.72)", fontSize: type.bodySm },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  heroChip: { paddingHorizontal: spacing.xs, paddingVertical: 3, borderRadius: radius.pill },
  heroChipText: { fontSize: type.caption, fontWeight: "800", letterSpacing: 0.6 },
  heroProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.16)",
    marginTop: spacing.md,
    overflow: "hidden",
  },
  heroProgressFill: { height: "100%", borderRadius: 3 },
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
  section: { letterSpacing: 1.1, fontSize: type.caption, marginTop: spacing.sm, marginBottom: spacing.sm },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  tileCard: { flexGrow: 1, flexBasis: "22%", alignItems: "center", paddingVertical: spacing.md },
  stateCard: { marginTop: 4 },
  emptyActions: { gap: spacing.sm, marginTop: 4 },
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
