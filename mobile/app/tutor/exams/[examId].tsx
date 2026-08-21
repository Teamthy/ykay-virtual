import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing } from "@/src/lib/theme";
import { getTutorExam, listExamAttempts, type PracticeAttemptItem, type PracticeExamSummary } from "@/src/lib/api";

// Exam results — a tutor's view of one paper: settings + every sitting with
// score, pass/fail and time taken. Like a school mark sheet.

export default function TutorExamDetail() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { colors } = useTheme();
  const [exam, setExam] = useState<PracticeExamSummary | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttemptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [e, a] = await Promise.all([getTutorExam(examId), listExamAttempts(examId)]);
      setExam(e);
      setAttempts(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this exam");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useFocusEffect(useCallback(() => void load(), [load]));

  if (loading) {
    return (
      <Screen scroll>
        <Skeleton height={110} />
        <Skeleton height={60} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }
  if (error || !exam) {
    return (
      <Screen scroll>
        <ErrorState title="Couldn't load this exam" message={error ?? "Not found"} onRetry={() => void load()} />
      </Screen>
    );
  }

  const passed = attempts.filter((a) => a.passed).length;
  const avg =
    attempts.length > 0
      ? Math.round(attempts.reduce((n, a) => n + (a.score ?? 0), 0) / attempts.length)
      : null;

  return (
    <Screen scroll>
      <ScreenHeader eyebrow={exam.subject.toUpperCase()} title={exam.title} subtitle={exam.description || undefined} />

      {/* Mark-sheet summary */}
      <Card style={styles.summary}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <AppText variant="h2" style={{ color: colors.deep }}>
              {attempts.length}
            </AppText>
            <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
              SITTINGS
            </AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="h2" style={{ color: colors.greenDark }}>
              {passed}
            </AppText>
            <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
              PASSED
            </AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="h2" style={{ color: colors.deepLight }}>
              {avg === null ? "—" : `${avg}%`}
            </AppText>
            <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
              AVG SCORE
            </AppText>
          </View>
        </View>
        <View style={[styles.metaChips, { borderTopColor: colors.border }]}>
          <View style={[styles.chip, { backgroundColor: colors.greenLight }]}>
            <AppText variant="caption" style={{ color: colors.greenDark }}>
              {exam.question_count} questions
            </AppText>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.greenLight }]}>
            <AppText variant="caption" style={{ color: colors.greenDark }}>
              {exam.duration_minutes} min
            </AppText>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.greenLight }]}>
            <AppText variant="caption" style={{ color: colors.greenDark }}>
              pass {exam.passing_score}%
            </AppText>
          </View>
        </View>
      </Card>

      <AppText variant="label" style={{ color: colors.ink[500], letterSpacing: 1.1, marginTop: spacing.xl, marginBottom: spacing.sm }}>
        ATTEMPT RESULTS
      </AppText>

      {attempts.length === 0 ? (
        <EmptyState
          icon="hourglass-outline"
          title="No sittings yet"
          description="When learners sit this paper, every attempt lands here with its score and pass/fail — like a mark sheet."
        />
      ) : (
        <View style={styles.list}>
          {attempts.map((a) => (
            <Card key={a.attempt_id} style={styles.rowCard}>
              <View style={[styles.scoreBox, { backgroundColor: a.passed ? colors.greenLight : colors.ink[100] }]}>
                <AppText variant="h3" style={{ color: a.passed ? colors.greenDark : colors.danger }}>
                  {a.score ?? "—"}%
                </AppText>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <AppText variant="heading">{a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : "In progress"}</AppText>
                <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                  {a.total} questions
                  {a.submitted_at ? ` · ${new Date(a.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                </AppText>
              </View>
              <Ionicons
                name={a.passed ? "checkmark-circle" : "close-circle"}
                size={22}
                color={a.passed ? colors.greenDark : colors.danger}
              />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { padding: spacing.lg },
  statRow: { flexDirection: "row" },
  stat: { flex: 1 },
  metaChips: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  list: { gap: spacing.sm },
  rowCard: { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  scoreBox: {
    width: 56,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
