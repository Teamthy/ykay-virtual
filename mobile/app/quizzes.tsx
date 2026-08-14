import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Quizzes — standard-LMS quiz list (M4): assessments published for the
// learner's courses. Attempts run through the /learning contract; the
// learner profile resolves from the bearer session (G1.2).

type Quiz = {
  id: string;
  cohort_id?: string;
  title: string;
  instructions?: string;
  pass_threshold: number;
  status: string;
};

type Lesson = { id: string; cohort_id?: string; title: string; start_at: string };

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Assessments are cohort-scoped: resolve the learner's cohorts from
      // the session-resolved lesson list, then merge quizzes across them.
      const lessons = await apiFetch<Lesson[]>("/me/lessons");
      const cohortIds = [...new Set((lessons.data ?? []).map((l) => l.cohort_id).filter(Boolean))] as string[];
      const results = await Promise.all(
        cohortIds.map((cid) =>
          apiFetch<Quiz[]>(`/learning/assessments?cohort_id=${encodeURIComponent(cid)}`)
            .then((r) => r.data ?? [])
            .catch(() => [])
        )
      );
      const merged = results.flat().filter((q) => q.status === "PUBLISHED");
      // De-dupe by id (an assessment may appear under one cohort only, but be safe).
      const seen = new Set<string>();
      setQuizzes(merged.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true))));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load quizzes");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Quizzes</Text>
      <Text style={styles.sub}>Auto-graded assessments from your courses.</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.gold} size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : quizzes.length === 0 ? (
        <Text style={styles.empty}>No quizzes yet — your tutor publishes them with each course.</Text>
      ) : (
        <FlatList
          data={quizzes}
          keyExtractor={(q) => q.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Link href={{ pathname: "/quizzes/[assessmentId]", params: { assessmentId: item.id } }} asChild>
              <Pressable style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>pass ≥ {item.pass_threshold}%</Text>
                  </View>
                </View>
                {item.instructions ? <Text style={styles.cardDesc}>{item.instructions}</Text> : null}
                <Text style={styles.cta}>Start quiz →</Text>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, padding: 24 },
  title: { fontSize: 24, fontWeight: "800", color: colors.navy },
  sub: { fontSize: 14, color: colors.ink[500], marginTop: 4, marginBottom: 20 },
  error: { color: colors.danger, marginTop: 24 },
  empty: { color: colors.ink[500], marginTop: 24, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E8E4DA", padding: 18 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink[900], flex: 1 },
  badge: { backgroundColor: colors.goldLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700", color: colors.goldDark },
  cardDesc: { fontSize: 13, color: colors.ink[500], marginTop: 8, lineHeight: 18 },
  cta: { marginTop: 12, fontSize: 13, fontWeight: "700", color: colors.navy },
});
