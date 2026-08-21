import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { Button } from "@/src/components/ui/Button";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { TabLayout } from "@/src/components/TabLayout";
import { BrandLogo } from "@/src/components/BrandLogo";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, radius, spacing, type } from "@/src/lib/theme";
import { apiFetch, getMyLessonProgress, listMyAttempts, listTutorExams, getToken, type LessonProgress, type PracticeAttemptItem } from "@/src/lib/api";
import { formatLessonTime, formatNaira, getTutorEarnings, getTutorLessons, type TutorEarnings, type TutorLesson } from "@/src/lib/tutor";

// Home — the NUVORA command center (design direction: docs/MOBILE_DASHBOARD_DIRECTION.md).
// Composition per the dashboard philosophy:
//   header (identity + notifications) → PRIMARY card (one dominant fact,
//   role-aware) → key metrics (2-up) → quick actions (primary CTA + tiles)
//   → recent activity (status chips) → more tools (compact, low weight).
// Learners see their next lesson + progress; parents see their learner's
// schedule; tutors see available balance + this week's teaching.

type Me = { id: string; email: string; roles: string[]; first_name?: string };
type Unread = { unread: number };
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

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtDay(t: string): string {
  return new Date(t).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function fmtTime(t: string): string {
  return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const { colors } = useTheme();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  // learner / parent feeds
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [watched, setWatched] = useState<Record<string, LessonProgress>>({});
  const [attempts, setAttempts] = useState<PracticeAttemptItem[]>([]);
  // tutor feeds
  const [earnings, setEarnings] = useState<TutorEarnings | null>(null);
  const [tutorLessons, setTutorLessons] = useState<TutorLesson[]>([]);
  const [exams, setExams] = useState<number>(0);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setMe(null);
        return;
      }
      const m = await apiFetch<Me>("/auth/me").catch(() => ({ data: null }));
      setMe(m.data);
      if (!m.data) return;

      const roles = m.data.roles ?? [];
      const isTutor = roles.includes("TUTOR");
      const isLearner = roles.includes("STUDENT") || roles.includes("PARENT");

      void apiFetch<Unread>("/me/notifications/unread-count")
        .then((u) => setUnread(u.data?.unread ?? 0))
        .catch(() => {});

      if (isTutor) {
        const [e, tl, ex] = await Promise.all([
          getTutorEarnings().catch(() => null),
          getTutorLessons().catch(() => [] as TutorLesson[]),
          listTutorExams().catch(() => []),
        ]);
        setEarnings(e);
        setTutorLessons(tl);
        setExams(ex.length);
      } else if (isLearner) {
        const [ls, prog, at] = await Promise.all([
          apiFetch<Lesson[]>("/me/lessons").catch(() => ({ data: [] as Lesson[] })),
          getMyLessonProgress().catch(() => [] as LessonProgress[]),
          listMyAttempts().catch(() => [] as PracticeAttemptItem[]),
        ]);
        setLessons(ls.data ?? []);
        setWatched(Object.fromEntries(prog.map((p) => [p.lesson_id, p])));
        setAttempts(at);
      }
    } catch {
      // session gone — signed-out fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const roles = me?.roles ?? [];
  const isTutor = roles.includes("TUTOR");
  const isParent = roles.includes("PARENT") && !roles.includes("STUDENT");
  const signedOut = !me && !loading;

  // ---- derived (learner / parent) ----
  const upcoming = useMemo(
    () => lessons.filter((l) => new Date(l.start_at).getTime() >= Date.now()).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [lessons]
  );
  const next = upcoming[0];
  const watchedCount = lessons.filter((l) => watched[l.id]?.watched).length;
  const watchedPct = lessons.length > 0 ? Math.round((watchedCount / lessons.length) * 100) : 0;
  const submitted = attempts.filter((a) => a.submitted_at);
  const avgScore = submitted.length > 0 ? Math.round(submitted.reduce((n, a) => n + (a.score ?? 0), 0) / submitted.length) : null;

  // ---- derived (tutor) ----
  const weekStart = Date.now();
  const weekEnd = weekStart + 7 * 24 * 3600 * 1000;
  const weekLessons = tutorLessons.filter((l) => {
    const t = new Date(l.start_at).getTime();
    return t >= weekStart && t < weekEnd;
  });
  const nextTutor = tutorLessons
    .filter((l) => new Date(l.start_at).getTime() >= Date.now())
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .slice(0, 3);

  // today's teaching window (local)
  const todayLessons = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return tutorLessons
      .filter((l) => {
        const t = new Date(l.start_at).getTime();
        return t >= start.getTime() && t <= end.getTime();
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [tutorLessons]);
  const nextToday = useMemo(
    () => todayLessons.find((l) => new Date(l.start_at).getTime() >= Date.now()) ?? todayLessons[0],
    [todayLessons]
  );
  const nextUpcoming = useMemo(
    () =>
      tutorLessons
        .filter((l) => new Date(l.start_at).getTime() >= Date.now())
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())[0],
    [tutorLessons]
  );

  const firstName = me?.first_name?.trim();

  // ---- loading skeleton (layout-stable) ----
  if (loading) {
    return (
      <TabLayout>
        <Screen scroll>
          <Skeleton height={28} width="55%" />
          <Skeleton height={16} width="35%" style={{ marginTop: spacing.sm }} />
          <Skeleton height={150} style={{ marginTop: spacing.xl }} />
          <View style={styles.metricGrid}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={76} style={{ flex: 1 }} />
            ))}
          </View>
          <Skeleton height={48} style={{ marginTop: spacing.xl }} />
          <Skeleton height={72} style={{ marginTop: spacing.sm }} />
          <Skeleton height={72} style={{ marginTop: spacing.xs }} />
        </Screen>
      </TabLayout>
    );
  }

  return (
    <TabLayout>
      <Screen scroll>
        {/* A. Header — personal workspace identity */}
        <Animated.View entering={FadeInDown.delay(60).springify().damping(16)}>
          <View style={styles.header}>
            {signedOut ? (
              <View style={styles.brandSlot}>
                <BrandLogo size={40} />
              </View>
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.deep }]}>
                <AppText style={{ color: colors.green, fontFamily: fonts.bodyBold, fontSize: 18 }}>
                  {(firstName?.[0] ?? me?.email?.[0] ?? "?").toUpperCase()}
                </AppText>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <AppText variant="bodySm" style={{ color: colors.ink[500] }}>
                {signedOut ? "Welcome to" : `${greeting()},`}
              </AppText>
              <AppText variant="h2">{signedOut ? "NUVORA" : firstName || "there"}</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
              onPress={() => router.push("/notifications" as never)}
              style={[styles.bell, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.deep} />
              {unread > 0 && (
                <View style={[styles.bellBadge, { backgroundColor: colors.green }]}>
                  <AppText variant="caption" style={{ color: colors.ink[950], fontWeight: "800" }}>
                    {unread > 9 ? "9+" : unread}
                  </AppText>
                </View>
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* B. Primary card — one dominant fact per role */}
        <Animated.View entering={FadeInDown.delay(120).springify().damping(16)}>
          {signedOut ? (
            <Card style={styles.welcomeCard}>
              <AppText variant="h2">Your learning command center</AppText>
              <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: spacing.xs, lineHeight: 20 }}>
                Track lessons, sit timed CBT practice exams, message vetted tutors and manage tuition escrow — all in one place.
              </AppText>
              <Button label="Log in" full style={{ marginTop: spacing.lg }} onPress={() => router.push("/login" as never)} />
              <Button label="Create account" variant="secondary" full style={{ marginTop: spacing.sm }} onPress={() => router.push("/onboarding" as never)} />
            </Card>
          ) : (
            <LinearGradient
              colors={[colors.navy, colors.navyDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              {isTutor ? (
                <>
                  <AppText variant="label" style={styles.heroEyebrow}>
                    TODAY'S SCHEDULE
                  </AppText>
                  <AppText variant="h1" style={styles.heroTitle} numberOfLines={2}>
                    {nextToday ? nextToday.title : "No classes today"}
                  </AppText>
                  <View style={styles.heroSubRow}>
                    {nextToday ? (
                      <>
                        <AppText style={styles.heroCap}>
                          {fmtTime(nextToday.start_at)}
                          {nextToday.meeting_url ? " · live class" : ""}
                        </AppText>
                        <View style={styles.heroDot} />
                        <View style={[styles.heroChip, { backgroundColor: nextToday.meeting_url ? "rgba(112,242,80,0.18)" : "rgba(255,255,255,0.12)" }]}>
                          <AppText style={[styles.heroChipText, { color: nextToday.meeting_url ? colors.green : colors.white }]}>
                            {nextToday.meeting_url ? "LIVE" : "CLASS"}
                          </AppText>
                        </View>
                        <View style={styles.heroDot} />
                        <AppText style={styles.heroCap}>
                          {todayLessons.length} {todayLessons.length === 1 ? "class" : "classes"} today
                        </AppText>
                      </>
                    ) : (
                      <AppText style={styles.heroCap}>
                        {nextUpcoming ? `Next: ${fmtDay(nextUpcoming.start_at)} · ${fmtTime(nextUpcoming.start_at)}` : "Your week is clear — relax or prep your exams."}
                      </AppText>
                    )}
                  </View>
                  <View style={styles.heroActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push("/tutor/schedule" as never)}
                      style={[styles.heroCta, { backgroundColor: colors.green }]}
                    >
                      <AppText style={{ color: colors.ink[950], fontFamily: fonts.bodyBold, fontWeight: "700" }}>View schedule</AppText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push("/tutor/exams/new" as never)}
                      style={[styles.heroGhost, { borderColor: "rgba(255,255,255,0.28)" }]}
                    >
                      <AppText style={{ color: colors.white }}>Create exam</AppText>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <AppText variant="label" style={styles.heroEyebrow}>
                    {isParent ? "LEARNER UP NEXT" : "UP NEXT"}
                  </AppText>
                  <AppText variant="h1" style={styles.heroTitle} numberOfLines={2}>
                    {next ? next.title : "No lessons scheduled yet"}
                  </AppText>
                  {next && (
                    <View style={styles.heroSubRow}>
                      <AppText style={styles.heroCap}>
                        {fmtDay(next.start_at)} · {fmtTime(next.start_at)}
                      </AppText>
                      <View style={styles.heroDot} />
                      <View style={[styles.heroChip, { backgroundColor: next.meeting_url ? "rgba(112,242,80,0.18)" : "rgba(255,255,255,0.12)" }]}>
                        <AppText style={[styles.heroChipText, { color: next.meeting_url ? colors.green : colors.white }]}>
                          {next.meeting_url ? "LIVE" : next.video_url ? "ON-DEMAND" : "SCHEDULED"}
                        </AppText>
                      </View>
                    </View>
                  )}
                  {lessons.length > 0 && (
                    <View style={styles.heroProgressTrack}>
                      <View style={[styles.heroProgressFill, { backgroundColor: colors.green, width: `${Math.max(watchedPct, 4)}%` }]} />
                    </View>
                  )}
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
                </>
              )}
            </LinearGradient>
          )}
        </Animated.View>

        {/* C. Key metrics — 2-up grid, tap-through to source */}
        {!signedOut && (
          <Animated.View entering={FadeInUp.delay(160).springify().damping(16)} style={styles.metricGrid}>
            {(isTutor
              ? [
                  { label: "THIS WEEK", value: String(weekLessons.length), href: "/tutor/schedule" },
                  { label: "EXAMS", value: String(exams), href: "/tutor/exams" },
                  { label: "HELD", value: earnings ? formatNaira(earnings.held_total) : "₦0", href: "/tutor/earnings" },
                  { label: "PAID OUT", value: earnings ? formatNaira(earnings.paid_total) : "₦0", href: "/tutor/earnings" },
                ]
              : [
                  { label: "LESSONS", value: String(lessons.length), href: "/lms" },
                  { label: "WATCHED", value: `${watchedPct}%`, href: "/lms" },
                  { label: "PRACTICE AVG", value: avgScore === null ? "—" : `${avgScore}%`, href: "/practice" },
                  { label: "ATTEMPTS", value: String(attempts.length), href: "/practice" },
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

        {/* D. Quick actions — primary CTA then secondary tiles */}
        {!signedOut && (
          <Animated.View entering={FadeInUp.delay(200).springify().damping(16)}>
            <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
              QUICK ACTIONS
            </AppText>
            {isTutor ? (
              <Button label="Create exam" full onPress={() => router.push("/tutor/exams/new" as never)} />
            ) : (
              <Button label={isParent ? "Find a tutor" : "Take a practice exam"} full onPress={() => router.push((isParent ? "/search" : "/practice") as never)} />
            )}
            <View style={styles.tiles}>
              {(isTutor
                ? [
                    { href: "/tutor/schedule", label: "Schedule", icon: "calendar-outline" },
                    { href: "/tutor/messages", label: "Messages", icon: "chatbubbles-outline" },
                    { href: "/tutor/earnings", label: "Earnings", icon: "wallet-outline" },
                    { href: "/tutor/exams", label: "Exams", icon: "document-text-outline" },
                  ]
                : isParent
                  ? [
                      { href: "/lms", label: "My learning", icon: "book-outline" },
                      { href: "/practice", label: "Practice", icon: "timer-outline" },
                      { href: "/messages", label: "Messages", icon: "mail-outline" },
                      { href: "/progress", label: "Progress", icon: "stats-chart-outline" },
                    ]
                  : [
                      { href: "/lms", label: "My learning", icon: "book-outline" },
                      { href: "/search", label: "Find a tutor", icon: "search-outline" },
                      { href: "/messages", label: "Messages", icon: "mail-outline" },
                      { href: "/saved", label: "Saved", icon: "heart-outline" },
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

        {/* E. Recent activity — status chips, tap-through */}
        <Animated.View entering={FadeInUp.delay(240).springify().damping(16)}>
          <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
            {signedOut ? "EXPLORE" : "RECENT ACTIVITY"}
          </AppText>

          {signedOut ? (
            <View style={styles.tiles}>
              {[
                { href: "/subjects", label: "Subjects", icon: "library-outline" },
                { href: "/exam-prep", label: "Exam prep", icon: "school-outline" },
                { href: "/search", label: "Find a tutor", icon: "search-outline" },
                { href: "/become-tutor", label: "Become a tutor", icon: "create-outline" },
              ].map((t) => (
                <Card key={t.href} onPress={() => router.push(t.href as never)} padded style={styles.tileCard}>
                  <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.deep} />
                  <AppText variant="label" style={{ marginTop: spacing.xs, color: colors.ink[700], textAlign: "center" }}>
                    {t.label}
                  </AppText>
                </Card>
              ))}
            </View>
          ) : isTutor ? (
            nextTutor.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="No lessons scheduled"
                description="Once learners book you, upcoming sessions appear here. Keep your availability current so parents can find free slots."
                action={<Button label="Set availability" onPress={() => router.push("/tutor/availability" as never)} />}
              />
            ) : (
              <View style={styles.activity}>
                {nextTutor.map((l) => (
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
            )
          ) : upcoming.length === 0 && submitted.length === 0 ? (
            <EmptyState
              icon="leaf-outline"
              title="Nothing here yet"
              description="Your lessons and practice results will show up here. Enrol on a programme or sit a CBT practice exam to get started."
              action={
                <View style={styles.emptyActions}>
                  <Button label="Practice exam" variant="dark" onPress={() => router.push("/practice" as never)} />
                  <Button label="Browse programmes" onPress={() => router.push("/subjects" as never)} />
                </View>
              }
            />
          ) : (
            <View style={styles.activity}>
              {upcoming.slice(0, 2).map((l) => (
                <Card key={l.id} onPress={() => router.push("/lms" as never)} style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: colors.greenLight }]}>
                    <Ionicons name="calendar-outline" size={16} color={colors.deep} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <AppText variant="heading" numberOfLines={1}>
                      {l.title}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                      {fmtDay(l.start_at)} · {fmtTime(l.start_at)}
                    </AppText>
                  </View>
                  <View style={[styles.chip, { backgroundColor: colors.greenLight }]}>
                    <AppText variant="caption" style={{ color: colors.greenDark }}>
                      {l.meeting_url ? "LIVE" : l.video_url ? "ON-DEMAND" : "UPCOMING"}
                    </AppText>
                  </View>
                </Card>
              ))}
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
          )}
        </Animated.View>

        {/* F. More tools — compact, low visual weight */}
        {!signedOut && (
          <Animated.View entering={FadeInUp.delay(280).springify().damping(16)}>
            <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
              EXPLORE MORE
            </AppText>
            <View style={styles.tools}>
              {[
                { href: "/quizzes", label: "Quizzes", icon: "create-outline" },
                { href: "/progress", label: "Progress", icon: "stats-chart-outline" },
                { href: "/subjects", label: "Subjects", icon: "library-outline" },
                { href: "/exam-prep", label: "Exam prep", icon: "school-outline" },
                { href: "/chat", label: "Chat", icon: "chatbubbles-outline" },
                { href: "/my-lessons", label: "My lessons", icon: "calendar-outline" },
                { href: "/saved", label: "Saved", icon: "heart-outline" },
                { href: "/account", label: "Account", icon: "person-outline" },
              ].map((t) => (
                <Pressable
                  key={t.href}
                  accessibilityRole="button"
                  onPress={() => router.push(t.href as never)}
                  style={styles.toolItem}
                >
                  <Ionicons name={t.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.ink[400]} />
                  <AppText variant="caption" style={{ color: colors.ink[500], marginTop: 4 }}>
                    {t.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}
      </Screen>
    </TabLayout>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  brandSlot: { marginRight: spacing.xs },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  welcomeCard: { padding: spacing.lg },
  hero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroEyebrow: { color: "#70F250", letterSpacing: 1.4, fontSize: type.caption },
  heroAmount: { color: "#FFFFFF", fontSize: 40, marginTop: spacing.xs },
  heroTitle: { color: "#FFFFFF", fontSize: 24, marginTop: spacing.xs, lineHeight: 30 },
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
  emptyActions: { gap: spacing.sm },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  toolItem: { width: "23%", alignItems: "center", paddingVertical: spacing.sm },
});
