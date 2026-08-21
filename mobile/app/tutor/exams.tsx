import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
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
import { deleteTutorExam, listTutorExams, type PracticeExamSummary } from "@/src/lib/api";

// Tutor exam console — author CBT papers (school/college exam style),
// review results, archive by deleting. Mirrors the web tutor workspace.

export default function TutorExams() {
  const { colors } = useTheme();
  const [exams, setExams] = useState<PracticeExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setExams(await listTutorExams());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your exams");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const remove = (e: PracticeExamSummary) => {
    Alert.alert("Delete exam?", `"${e.title}" and all its attempts will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTutorExam(e.id);
            void load();
          } catch (err) {
            Alert.alert("Delete failed", err instanceof Error ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="TUTOR CONSOLE"
        title="My exams"
        subtitle="Author timed CBT papers for your learners — one correct answer per question, instant auto-marking."
      />

      <Button
        label="Create new exam"
        icon={<Ionicons name="add" size={18} color={colors.ink[950]} />}
        full
        style={{ marginBottom: spacing.lg }}
        onPress={() => router.push("/tutor/exams/new" as never)}
      />

      {loading ? (
        [0, 1].map((i) => <Skeleton key={i} height={84} style={{ marginBottom: spacing.sm }} />)
      ) : error ? (
        <ErrorState title="Couldn't load your exams" message={error} onRetry={() => void load()} />
      ) : exams.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="No exams yet"
          description="Create your first CBT paper — set the subject, duration, pass mark and questions, and your learners can sit it from the Practice tab."
          action={<Button label="Create new exam" onPress={() => router.push("/tutor/exams/new" as never)} />}
        />
      ) : (
        <View style={styles.list}>
          {exams.map((e) => (
            <Card key={e.id} onPress={() => router.push({ pathname: "/tutor/exams/[examId]", params: { examId: e.id } })} style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: colors.greenLight }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.deep} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <AppText variant="h3">{e.title}</AppText>
                  <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                    {e.subject} · {e.question_count} questions · {e.duration_minutes} min · pass {e.passing_score}%
                  </AppText>
                  <AppText variant="caption" style={{ color: e.status === "ACTIVE" ? colors.greenDark : colors.ink[400], marginTop: 2 }}>
                    {e.status === "ACTIVE" ? "Live for students" : "Archived"}
                  </AppText>
                </View>
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.ink[300]}
                  accessibilityLabel={`Delete ${e.title}`}
                  onPress={() => remove(e)}
                />
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  card: { marginBottom: 0 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
