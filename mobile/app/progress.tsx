import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Progress — standard-LMS progress view (M4): attendance summary + the
// learner's progress reports, all session-resolved (G1.2).

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
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.sub}>Attendance and tutor reports.</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.gold} size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          {summary && (
            <View style={styles.gaugeCard}>
              <Text style={styles.gaugeValue}>{Math.round(rate * 100)}%</Text>
              <Text style={styles.gaugeLabel}>attendance</Text>
              <View style={styles.gaugeTrack}>
                <View style={[styles.gaugeFill, { width: `${Math.min(100, Math.round(rate * 100))}%` }]} />
              </View>
              <Text style={styles.gaugeDetail}>
                {summary.attended}/{summary.total_lessons} lessons attended · {summary.upcoming_lessons} upcoming
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Tutor reports</Text>
          {reports.length === 0 ? (
            <Text style={styles.empty}>No progress reports yet — your tutor writes them after lessons.</Text>
          ) : (
            reports.map((r) => (
              <View key={r.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportTitle}>
                    {r.period_start.slice(0, 10)} → {r.period_end.slice(0, 10)}
                  </Text>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{"★".repeat(Math.max(1, Math.min(5, r.overall_rating)))}</Text>
                  </View>
                </View>
                {r.strengths ? <Text style={styles.reportLine}>💪 {r.strengths}</Text> : null}
                {r.weaknesses ? <Text style={styles.reportLine}>🎯 {r.weaknesses}</Text> : null}
                {r.recommendations ? <Text style={styles.reportLine}>📌 {r.recommendations}</Text> : null}
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "800", color: colors.navy },
  sub: { fontSize: 14, color: colors.ink[500], marginTop: 4, marginBottom: 20 },
  error: { color: colors.danger, marginTop: 24 },
  empty: { color: colors.ink[500], marginTop: 8, lineHeight: 20 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.navy, marginTop: 24, marginBottom: 12 },
  gaugeCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E8E4DA", padding: 20, alignItems: "center" },
  gaugeValue: { fontSize: 40, fontWeight: "800", color: colors.navy },
  gaugeLabel: { fontSize: 13, color: colors.ink[500], marginTop: 2 },
  gaugeTrack: { alignSelf: "stretch", height: 10, backgroundColor: colors.surface, borderRadius: radius.pill, marginTop: 12, overflow: "hidden" },
  gaugeFill: { height: "100%", backgroundColor: colors.gold, borderRadius: radius.pill },
  gaugeDetail: { fontSize: 12, color: colors.ink[500], marginTop: 10 },
  reportCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E8E4DA", padding: 16, marginBottom: 12 },
  reportHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reportTitle: { fontSize: 14, fontWeight: "700", color: colors.ink[900] },
  ratingBadge: { backgroundColor: colors.goldLight, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { color: colors.goldDark, fontSize: 12, fontWeight: "800" },
  reportLine: { fontSize: 13, color: colors.ink[600], marginTop: 6, lineHeight: 18 },
});
