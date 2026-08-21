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
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, radius, spacing, type } from "@/src/lib/theme";
import { formatLessonTime, getTutorLessons, type TutorLesson } from "@/src/lib/tutor";

// Tutor schedule — the week-view command center: CLASSES THIS WEEK is the
// dominant fact, the next 7 days group by day, and the availability CTA keeps
// the booking window open. Dark-mode aware.

export default function TutorScheduleScreen() {
  const { colors } = useTheme();
  const [lessons, setLessons] = useState<TutorLesson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLessons(await getTutorLessons());
    } catch {
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const { byDay, weekCount, next } = useMemo(() => {
    const now = Date.now();
    const horizon = now + 7 * 24 * 60 * 60 * 1000;
    const inWindow = lessons
      .filter((l) => {
        const t = new Date(l.start_at).getTime();
        return t >= now && t <= horizon;
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    const map = new Map<string, TutorLesson[]>();
    for (const l of inWindow) {
      const key = new Date(l.start_at).toLocaleDateString("en-NG", {
        weekday: "long",
        day: "numeric",
        month: "short",
      });
      const arr = map.get(key) ?? [];
      arr.push(l);
      map.set(key, arr);
    }
    return { byDay: Array.from(map.entries()), weekCount: inWindow.length, next: inWindow[0] };
  }, [lessons]);

  if (loading) {
    return (
      <Screen scroll>
        <Skeleton height={140} />
        <Skeleton height={72} style={{ marginTop: spacing.lg }} />
        <Skeleton height={72} style={{ marginTop: spacing.sm }} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Schedule"
        title="Your next 7 days"
        subtitle="Everything you're teaching this week, grouped by day."
      />

      {/* B. Primary card — this week's classes is the dominant fact */}
      <Animated.View entering={FadeIn.delay(80).duration(240)}>
        <LinearGradient colors={[colors.navy, colors.navyDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <AppText variant="label" style={styles.heroEyebrow}>
            CLASSES THIS WEEK
          </AppText>
          <AppText variant="display" style={styles.heroAmount}>
            {weekCount}
          </AppText>
          <View style={styles.heroSubRow}>
            {next ? (
              <View style={[styles.heroChip, { backgroundColor: next.meeting_url ? "rgba(112,242,80,0.18)" : "rgba(255,255,255,0.12)" }]}>
                <AppText style={[styles.heroChipText, { color: next.meeting_url ? colors.green : colors.white }]}>
                  NEXT: {formatLessonTime(next.start_at)}
                </AppText>
              </View>
            ) : (
              <AppText style={styles.heroCap}>No classes in the next 7 days</AppText>
            )}
          </View>
          <View style={styles.heroActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/tutor/availability" as never)}
              style={[styles.heroCta, { backgroundColor: colors.green }]}
            >
              <AppText style={{ color: colors.ink[950], fontFamily: fonts.bodyBold, fontWeight: "700" }}>Set availability</AppText>
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

      {byDay.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Nothing scheduled this week"
          description="Once lessons are booked they'll show here. Keep your availability current so parents can find free slots."
          action={<Button label="Set availability" onPress={() => router.push("/tutor/availability" as never)} />}
        />
      ) : (
        byDay.map(([day, items], di) => (
          <Animated.View key={day} entering={FadeIn.delay(120 + di * 60).duration(240)} style={styles.dayBlock}>
            <AppText variant="label" style={{ color: colors.ink[500], letterSpacing: 1.1, fontSize: type.caption, marginBottom: spacing.xs, marginTop: spacing.sm }}>
              {day.toUpperCase()}
            </AppText>
            {items.map((l) => (
              <Card key={l.id} padded style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <AppText variant="h3" style={{ flex: 1 }}>
                      {l.title}
                    </AppText>
                    {l.meeting_url ? (
                      <View style={[styles.chip, { backgroundColor: colors.greenLight }]}>
                        <AppText variant="caption" style={{ color: colors.greenDark, fontWeight: "800" }}>
                          LIVE
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                    {formatLessonTime(l.start_at)}
                  </AppText>
                </View>
              </Card>
            ))}
          </Animated.View>
        ))
      )}

      <Card onPress={() => router.push("/tutor/availability" as never)} padded style={styles.availabilityCta}>
        <Ionicons name="time-outline" size={20} color={colors.deep} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="h3">Set your availability</AppText>
          <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
            Control the hours learners can book you.
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.greenDark} />
      </Card>
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
  dayBlock: { marginBottom: 8 },
  row: { marginBottom: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  chip: { paddingHorizontal: spacing.xs, paddingVertical: 3, borderRadius: radius.pill },
  availabilityCta: { flexDirection: "row", alignItems: "center", marginTop: 20 },
});
