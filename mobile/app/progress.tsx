import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, radius, spacing, type } from "@/src/lib/theme";
import { apiFetch, learnerQuery } from "@/src/lib/api";
import { useLearner } from "@/src/lib/learner-context";

// Progress — the learning-analytics command center: attendance rate is the
// dominant fact (gradient hero + animated fill), key attendance metrics in a
// 2-up grid, then tutor progress reports. The attendance shape matches the
// backend /me/attendance-summary payload (total/present/absent/late/excused/rate).

type AttendanceSummary = {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  untracked: number;
  rate: number;
};
type Report = {
  id: string;
  period_start: string;
  period_end: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  overall_rating?: number | null;
};

function Gauge({ rate, fill }: { rate: number; fill: string }) {
  const pct = Math.min(100, Math.round(rate * 100));
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withSpring(pct, { damping: 20, stiffness: 90 });
  }, [pct, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={styles.gaugeTrack}>
      <Animated.View style={[styles.gaugeFill, anim, { backgroundColor: fill }]} />
    </View>
  );
}

export default function Progress() {
  const { colors } = useTheme();
  const { selectedId: learnerId } = useLearner();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, r] = await Promise.all([
        apiFetch<AttendanceSummary>(`/me/attendance-summary${learnerQuery(learnerId)}`).catch(() => ({ data: null })),
        apiFetch<Report[]>(`/learning/progress-reports${learnerQuery(learnerId)}`).catch(() => ({ data: [] })),
      ]);
      setSummary(a.data);
      setReports(r.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load progress");
    } finally {
      setLoading(false);
    }
  }, [learnerId]);

  useFocusEffect(useCallback(() => void load(), [load]));

  const rate = summary?.rate ?? 0;
  const ratePct = Math.round(rate * 100);

  if (loading) {
    return (
      <Screen scroll>
        <Skeleton height={180} />
        <View style={styles.metricGrid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={76} style={{ flex: 1 }} />
          ))}
        </View>
        <Skeleton height={110} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen scroll>
        <ErrorState title="Couldn't load progress" message={error} onRetry={() => void load()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="GROWTH"
        title="Progress"
        subtitle="Attendance and tutor reports, all in one view."
      />

      {/* B. Primary card — attendance is the dominant fact */}
      {summary && (
        <Animated.View entering={FadeIn.delay(80).duration(240)}>
          <LinearGradient colors={[colors.navy, colors.navyDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <AppText variant="label" style={styles.heroEyebrow}>
              ATTENDANCE
            </AppText>
            <AppText variant="display" style={styles.heroAmount}>
              {ratePct}%
            </AppText>
            <Gauge rate={rate} fill={colors.green} />
            <AppText style={styles.heroCap}>
              {summary.present} of {summary.total} lessons attended
            </AppText>
            <View style={styles.heroActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/my-lessons" as never)}
                style={[styles.heroCta, { backgroundColor: colors.green }]}
              >
                <AppText style={{ color: colors.ink[950], fontFamily: fonts.bodyBold, fontWeight: "700" }}>View lessons</AppText>
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
      )}

      {/* C. Key metrics */}
      {summary && (
        <Animated.View entering={FadeIn.delay(140).duration(240)} style={styles.metricGrid}>
          {[
            { label: "PRESENT", value: String(summary.present), color: colors.greenDark },
            { label: "LATE", value: String(summary.late), color: colors.warning },
            { label: "ABSENT", value: String(summary.absent), color: colors.danger },
            { label: "EXCUSED", value: String(summary.excused), color: colors.deepLight },
          ].map((m) => (
            <Card key={m.label} padded style={styles.metricCard}>
              <AppText variant="caption" style={{ color: colors.ink[400], letterSpacing: 0.8 }}>
                {m.label}
              </AppText>
              <AppText variant="h2" style={{ color: m.color, marginTop: 4 }}>
                {m.value}
              </AppText>
            </Card>
          ))}
        </Animated.View>
      )}

      {/* Reports */}
      <AppText variant="label" style={[styles.sectionTitle, { color: colors.ink[500] }]}>
        TUTOR REPORTS
      </AppText>
      {reports.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No progress reports yet"
          description="Your tutor writes these after lessons — strengths, focus areas and recommendations land here."
        />
      ) : (
        <View style={styles.list}>
          {reports.map((r, i) => (
            <Animated.View key={r.id} entering={FadeIn.delay(100 + i * 60).duration(240)}>
              <Card style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <AppText variant="h3" style={{ flex: 1 }}>
                    {r.period_start.slice(0, 10)} → {r.period_end.slice(0, 10)}
                  </AppText>
                  <View style={[styles.ratingBadge, { backgroundColor: colors.greenLight }]}>
                    <AppText variant="caption" style={{ color: colors.greenDark, fontWeight: "800" }}>
                      {r.overall_rating != null ? "★".repeat(Math.max(1, Math.min(5, r.overall_rating))) : "—"}
                    </AppText>
                  </View>
                </View>
                {r.strengths ? (
                  <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 18 }}>
                    <Ionicons name="fitness-outline" size={13} color={colors.greenDark} /> {r.strengths}
                  </AppText>
                ) : null}
                {r.weaknesses ? (
                  <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 18 }}>
                    <Ionicons name="flag-outline" size={13} color={colors.warning} /> {r.weaknesses}
                  </AppText>
                ) : null}
                {r.recommendations ? (
                  <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 18 }}>
                    <Ionicons name="compass-outline" size={13} color={colors.deep} /> {r.recommendations}
                  </AppText>
                ) : null}
              </Card>
            </Animated.View>
          ))}
        </View>
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
  gaugeTrack: {
    alignSelf: "stretch",
    height: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.pill,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  gaugeFill: { height: "100%", borderRadius: radius.pill },
  heroCap: { color: "rgba(255,255,255,0.72)", fontSize: type.bodySm, marginTop: spacing.sm },
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
  sectionTitle: { letterSpacing: 1.1, fontSize: type.caption, marginTop: spacing.sm, marginBottom: spacing.sm },
  list: { gap: 12 },
  reportCard: { padding: 18 },
  reportHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  ratingBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
});
