import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Progress — premium attendance gauge + tutor progress reports, all
// session-resolved.

type AttendanceSummary = {
  total_lessons: number;
  attended: number;
  attendance_rate: number;
  upcoming_lessons: number;
};
type Report = {
  id: string;
  period_start: string;
  period_end: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  overall_rating: number;
};

function Gauge({ rate }: { rate: number }) {
  const pct = Math.min(100, Math.round(rate * 100));
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withSpring(pct, { damping: 20, stiffness: 90 });
  }, [pct, w]);
  const anim = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={styles.gaugeTrack}>
      <Animated.View style={[styles.gaugeFill, anim]} />
    </View>
  );
}

export default function Progress() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, r] = await Promise.all([
        apiFetch<AttendanceSummary>("/me/attendance-summary").catch(() => ({ data: null })),
        apiFetch<Report[]>("/learning/progress-reports").catch(() => ({ data: [] })),
      ]);
      setSummary(a.data);
      setReports(r.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load progress");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const rate = summary?.attendance_rate ?? 0;

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="GROWTH"
        title="Progress"
        subtitle="Attendance and tutor reports, all in one view."
      />

      {loading ? (
        <Animated.View entering={FadeInUp.delay(80)}>
          <View style={styles.skeletonCard} />
          <View style={styles.skeletonCard} />
        </Animated.View>
      ) : error ? (
        <Animated.View entering={FadeInUp.delay(80)} style={styles.stateCard}>
          <AppText style={{ fontSize: 30 }}>⚠️</AppText>
          <AppText variant="h3" style={{ marginTop: 8 }}>
            Couldn't load progress
          </AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 4 }}>
            {error}
          </AppText>
          <Button label="Try again" variant="dark" style={{ marginTop: 16, alignSelf: "center" }} onPress={() => void load()} />
        </Animated.View>
      ) : (
        <>
          {summary && (
            <Animated.View entering={FadeInDown.delay(80).springify().damping(16)}>
              <View style={styles.gaugeCard}>
                <AppText style={styles.gaugeValue}>{Math.round(rate * 100)}%</AppText>
                <AppText variant="label" style={{ color: colors.ink[500] }}>
                  ATTENDANCE
                </AppText>
                <Gauge rate={rate} />
                <AppText variant="caption" style={{ color: colors.ink[500], marginTop: 10 }}>
                  {summary.attended}/{summary.total_lessons} lessons attended · {summary.upcoming_lessons} upcoming
                </AppText>
              </View>
            </Animated.View>
          )}

          <AppText variant="label" style={styles.sectionTitle}>
            TUTOR REPORTS
          </AppText>
          {reports.length === 0 ? (
            <View style={styles.stateCard}>
              <AppText style={{ fontSize: 32 }}>📊</AppText>
              <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 8, lineHeight: 19 }}>
                No progress reports yet — your tutor writes them after lessons.
              </AppText>
            </View>
          ) : (
            <View style={styles.list}>
              {reports.map((r, i) => (
                <Animated.View key={r.id} entering={FadeInUp.delay(100 + i * 60).springify().damping(18)}>
                  <Card style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <AppText variant="h3" style={{ flex: 1 }}>
                        {r.period_start.slice(0, 10)} → {r.period_end.slice(0, 10)}
                      </AppText>
                      <View style={styles.ratingBadge}>
                        <AppText variant="caption" style={styles.ratingText}>
                          {"★".repeat(Math.max(1, Math.min(5, r.overall_rating)))}
                        </AppText>
                      </View>
                    </View>
                    {r.strengths ? (
                      <AppText variant="bodySm" style={styles.reportLine}>
                        💪 {r.strengths}
                      </AppText>
                    ) : null}
                    {r.weaknesses ? (
                      <AppText variant="bodySm" style={styles.reportLine}>
                        🎯 {r.weaknesses}
                      </AppText>
                    ) : null}
                    {r.recommendations ? (
                      <AppText variant="bodySm" style={styles.reportLine}>
                        📌 {r.recommendations}
                      </AppText>
                    ) : null}
                  </Card>
                </Animated.View>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeletonCard: { height: 120, borderRadius: radius.lg, backgroundColor: colors.ink[100], marginBottom: 14 },
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
  gaugeCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: "center",
  },
  gaugeValue: { fontSize: 46, fontWeight: "800", color: colors.white },
  gaugeTrack: { alignSelf: "stretch", height: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.pill, marginTop: 14, overflow: "hidden" },
  gaugeFill: { height: "100%", backgroundColor: colors.gold, borderRadius: radius.pill },
  sectionTitle: { color: colors.goldDark, letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  list: { gap: 12 },
  reportCard: { padding: 18 },
  reportHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  ratingBadge: { backgroundColor: colors.goldLight, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { color: colors.goldDark, fontWeight: "800" },
  reportLine: { color: colors.ink[600], marginTop: 6, lineHeight: 18 },
});
