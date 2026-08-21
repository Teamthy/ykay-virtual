import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing } from "@/src/lib/theme";
import { listMyAttempts, listPracticeExams, type PracticeAttemptItem, type PracticeExamSummary } from "@/src/lib/api";

// Practice exams hub — CBT papers for students: available exams (open or
// cohort-scoped) + attempt history with scores. Timed, JAMB/WAEC-style.

type Tab = "available" | "history";

export default function Practice() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>("available");
  const [exams, setExams] = useState<PracticeExamSummary[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [e, a] = await Promise.all([
        listPracticeExams().catch(() => [] as PracticeExamSummary[]),
        listMyAttempts().catch(() => [] as PracticeAttemptItem[]),
      ]);
      setExams(e);
      setAttempts(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load practice exams");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="CBT PRACTICE"
        title="Practice exams"
        subtitle="Timed computer-based tests set by your tutors — sit them anywhere, see your score instantly."
      />

      {/* Tab switch */}
      <View style={[styles.segment, { backgroundColor: colors.surfaceAlt }]}>
        {(["available", "history"] as Tab[]).map((t) => (
          <View
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            onTouchEnd={() => setTab(t)}
            style={[styles.segmentItem, tab === t && { backgroundColor: colors.surface }]}
          >
            <AppText variant="label" style={{ color: tab === t ? colors.deep : colors.ink[500], textTransform: "capitalize" }}>
              {t === "available" ? "Available" : "My attempts"}
            </AppText>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={{ marginTop: spacing.lg }}>
          {[0, 1].map((i) => (
            <Skeleton key={i} height={96} style={{ marginBottom: spacing.md }} />
          ))}
        </View>
      ) : error ? (
        <ErrorState title="Couldn't load practice exams" message={error} onRetry={() => void load()} />
      ) : tab === "available" ? (
        exams.length === 0 ? (
          <EmptyState
            icon="timer-outline"
            title="No practice exams yet"
            description="Your tutors haven't published any CBT papers yet. Check back soon — new exams appear here automatically."
          />
        ) : (
          <View style={styles.list}>
            {exams.map((e) => (
              <Card key={e.id} onPress={() => router.push({ pathname: "/practice/[examId]", params: { examId: e.id } })} style={styles.examCard}>
                <View style={styles.examTop}>
                  <View style={[styles.examIcon, { backgroundColor: colors.greenLight }]}>
                    <Ionicons name="document-text-outline" size={20} color={colors.deep} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <AppText variant="h3">{e.title}</AppText>
                    <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                      {e.subject} · {e.question_count} questions · {e.duration_minutes} min · pass {e.passing_score}%
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.ink[300]} />
                </View>
              </Card>
            ))}
          </View>
        )
      ) : attempts.length === 0 ? (
        <EmptyState
          icon="stats-chart-outline"
          title="No attempts yet"
          description="Sit an exam and your scores will appear here — complete with the marked paper for review."
          action={<Button label="View available exams" onPress={() => setTab("available")} />}
        />
      ) : (
        <View style={styles.list}>
          {attempts.map((a) => (
            <Card key={a.attempt_id} style={styles.examCard}>
              <View style={styles.examTop}>
                <View style={[styles.scorePill, { backgroundColor: a.passed ? colors.greenLight : colors.ink[100] }]}>
                  <AppText variant="h3" style={{ color: a.passed ? colors.greenDark : colors.danger }}>
                    {a.score ?? "—"}%
                  </AppText>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <AppText variant="h3">{a.exam_title}</AppText>
                  <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                    {a.exam_subject} · {a.total} questions
                  </AppText>
                  <AppText variant="caption" style={{ color: a.passed ? colors.greenDark : colors.danger, marginTop: 2 }}>
                    {a.submitted_at ? (a.passed ? "Passed" : "Not passed") : "In progress"}
                    {a.submitted_at ? ` · ${new Date(a.submitted_at).toLocaleDateString()}` : ""}
                  </AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  list: { gap: spacing.sm },
  examCard: { marginBottom: 0 },
  examTop: { flexDirection: "row", alignItems: "center" },
  examIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  scorePill: {
    width: 56,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
