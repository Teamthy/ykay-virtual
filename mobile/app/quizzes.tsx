import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Screen } from "@/src/components/ui/Screen";
import { TabLayout } from "@/src/components/TabLayout";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Quizzes — premium assessment list for the learner's courses. Attempts run
// through the /learning contract; the learner profile resolves from the
// bearer session.

type Quiz = {
  id: string;
  cohort_id?: string;
  title: string;
  instructions?: string;
  pass_threshold: number;
  status: string;
};
type Lesson = { id: string; cohort_id?: string; title: string; start_at: string };

const QUIZ_ICONS = ["📝", "🧠", "✍️", "🔢", "🔬", "🌍"];

export default function Quizzes() {
  const { colors } = useTheme();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lessons = await apiFetch<Lesson[]>("/me/lessons");
      const cohortIds = [...new Set((lessons.data ?? []).map((l) => l.cohort_id).filter(Boolean))] as string[];
      const results = await Promise.all(
        cohortIds.map((cid) =>
          apiFetch<Quiz[]>(`/learning/assessments?cohort_id=${encodeURIComponent(cid)}`)
            .then((r) => r.data ?? [])
            .catch(() => [])
        )
      );
      const merged = results.flat().filter((q) => q.status === "PUBLISHED" || q.status === "CLOSED");
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
    <TabLayout>
    <Screen scroll>
      <ScreenHeader
        eyebrow="ASSESSMENTS"
        title="Quizzes"
        subtitle="Auto-graded assessments that reinforce each course."
      />

      {loading ? (
        <Animated.View entering={FadeIn.delay(80).duration(240)}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={88} style={{ marginBottom: 12 }} />
          ))}
        </Animated.View>
      ) : error ? (
        <Animated.View entering={FadeIn.delay(80).duration(240)} style={[styles.stateCard, { backgroundColor: colors.surface }]}>
          <AppText style={{ fontSize: 30 }}>⚠️</AppText>
          <AppText variant="h3" style={{ marginTop: 8 }}>
            Couldn't load quizzes
          </AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 4 }}>
            {error}
          </AppText>
          <Button label="Try again" variant="dark" style={{ marginTop: 16, alignSelf: "center" }} onPress={() => void load()} />
        </Animated.View>
      ) : quizzes.length === 0 ? (
        <Animated.View entering={FadeIn.delay(80).duration(240)} style={[styles.stateCard, { backgroundColor: colors.surface }]}>
          <AppText style={{ fontSize: 34 }}>📭</AppText>
          <AppText variant="h3" style={{ textAlign: "center", marginTop: 10 }}>
            No quizzes yet
          </AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 6, lineHeight: 19 }}>
            Your tutor publishes quizzes with each course — check back soon.
          </AppText>
        </Animated.View>
      ) : (
        <View style={styles.list}>
          {quizzes.map((q, i) => (
            <Animated.View key={q.id} entering={FadeIn.delay(100 + i * 60).duration(240)}>
              <Card
                onPress={() =>
                  router.push({ pathname: "/quizzes/[assessmentId]", params: { assessmentId: q.id } })
                }
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.iconTile, { backgroundColor: colors.greenLight }]}>
                    <AppText style={{ fontSize: 22 }}>{QUIZ_ICONS[i % QUIZ_ICONS.length]}</AppText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="h3">{q.title}</AppText>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: q.status === "CLOSED" ? colors.ink[200] : colors.green },
                        ]}
                      >
                        <AppText variant="caption" style={[styles.badgeText, { color: colors.ink[950] }]}>
                          {q.status === "CLOSED" ? "CLOSED" : `PASS ≥ ${q.pass_threshold}%`}
                        </AppText>
                      </View>
                    </View>
                  </View>
                  <AppText style={{ fontSize: 18, color: colors.goldDark }}>›</AppText>
                </View>
                {q.instructions ? (
                  <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 10 }}>
                    {q.instructions}
                  </AppText>
                ) : null}
              </Card>
            </Animated.View>
          ))}
        </View>
      )}

    </Screen>
    </TabLayout>
  );
}

const styles = StyleSheet.create({
  stateCard: {
    borderRadius: radius.lg,
    padding: 24,
    alignItems: "center",
    shadowColor: "#002A18",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  list: { gap: 12 },
  card: { padding: 18 },
  cardTop: { flexDirection: "row", alignItems: "center" },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: { flexDirection: "row", marginTop: 4 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  badgeText: { fontWeight: "800" },
});
