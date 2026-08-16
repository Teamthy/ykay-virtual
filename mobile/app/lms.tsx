import { useCallback, useState } from "react";
import { Link, router, useFocusEffect } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";
import { TabBar } from "@/src/components/TabBar";

// M3 — student LMS: my courses (cohorts) with lesson counts + next lesson.

type Lesson = { id: string; cohort_id?: string; title: string; start_at: string; status: string };
type Course = { cohortId: string; lessons: Lesson[] };

export default function Lms() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // G1: the learner profile resolves from the bearer session server-side.
      const res = await apiFetch<Lesson[]>("/me/lessons");
      const map = new Map<string, Lesson[]>();
      for (const l of res.data ?? []) {
        const cid = l.cohort_id ?? "none";
        map.set(cid, [...(map.get(cid) ?? []), l]);
      }
      setCourses([...map.entries()].map(([cohortId, lessons]) => ({ cohortId, lessons })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <View style={styles.root}>
      <Text style={styles.title}>My Learning</Text>
      <Text style={styles.sub}>Courses, lessons and progress.</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.gold} size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : courses.length === 0 ? (
        <Text style={styles.empty}>You're not enrolled in any course yet — browse cohorts on the web app.</Text>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => c.cohortId}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Link href={{ pathname: "/lms/[cohortId]", params: { cohortId: item.cohortId } }} asChild>
              <Pressable style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Course {item.cohortId.slice(0, 8)}…</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.lessons.length} lessons</Text>
                  </View>
                </View>
                {item.lessons[0] && (
                  <Text style={styles.cardMeta}>
                    Next: {item.lessons[0].title}
                    {"\n"}{new Date(item.lessons[0].start_at).toLocaleString()}
                  </Text>
                )}
              </Pressable>
            </Link>
          )}
        />
      )}

      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, padding: 20 },
  title: { fontSize: 26, fontWeight: "800", color: colors.navy },
  sub: { fontSize: 13, color: colors.ink[500], marginTop: 4, marginBottom: 16 },
  error: { color: colors.danger, marginTop: 24, textAlign: "center" },
  empty: { color: colors.ink[500], marginTop: 32, textAlign: "center", lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E8E4DA", padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.navy, flex: 1 },
  badge: { backgroundColor: colors.goldLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.navy },
  cardMeta: { fontSize: 12, color: colors.ink[600], marginTop: 8, lineHeight: 18 },
  back: { marginTop: 12, alignSelf: "flex-start" },
  backText: { color: colors.goldDark, fontWeight: "700", fontSize: 14 },
});
