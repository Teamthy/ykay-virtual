import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Screen } from "@/src/components/ui/Screen";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { colors, radius, shadow } from "@/src/lib/theme";
import { LoaderScreen } from "@/src/components/ui/LoaderScreen";
import { apiFetch } from "@/src/lib/api";

// Quiz player — premium attempt flow: start → single-attempt questions →
// auto-grade on submit → result. The learner profile resolves from the bearer
// session.

type Question = { id: string; question: string; options: string[] };
type Start = { title: string; attempt: { id: string }; questions: Question[]; pass_threshold: number };
type Result = { score: number; max_score: number; passed: boolean; correct: number; total: number };

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; start: Start }
  | { kind: "submitting" }
  | { kind: "done"; result: Result; title: string };

export default function QuizPlayer() {
  const { assessmentId } = useLocalSearchParams<{ assessmentId: string }>();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const start = useCallback(async () => {
    setPhase({ kind: "loading" });
    try {
      const res = await apiFetch<Start>(`/learning/assessments/${assessmentId}/start`, { method: "POST" });
      setAnswers({});
      setPhase({ kind: "ready", start: res.data });
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "Could not start the quiz" });
    }
  }, [assessmentId]);

  useEffect(() => void start(), [start]);

  const submit = async () => {
    if (phase.kind !== "ready") return;
    setPhase({ kind: "submitting" });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const res = await apiFetch<Result>(`/learning/assessments/${assessmentId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: Object.entries(answers).map(([question_id, chosen_index]) => ({ question_id, chosen_index })),
        }),
      });
      void Haptics.notificationAsync(
        res.data.passed ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
      ).catch(() => {});
      setPhase({ kind: "done", result: res.data, title: phase.start.title });
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "Could not submit the quiz" });
    }
  };

  if (phase.kind === "loading" || phase.kind === "submitting") {
    return <LoaderScreen label={phase.kind === "submitting" ? "Grading your answers…" : "Preparing your quiz…"} />;
  }

  if (phase.kind === "error") {
    return (
      <Screen scroll={false} style={styles.center}>
        <AppText style={{ fontSize: 34 }}>😕</AppText>
        <AppText variant="h3" style={{ textAlign: "center", marginTop: 8 }}>
          Couldn't start the quiz
        </AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 4 }}>
          {phase.message}
        </AppText>
        <Button label="Try again" variant="dark" style={{ marginTop: 18 }} onPress={() => void start()} />
      </Screen>
    );
  }

  if (phase.kind === "done") {
    const { result, title } = phase;
    return (
      <Screen scroll>
        <View style={styles.centerTop}>
          <AppText variant="caption" style={{ color: colors.goldDark, letterSpacing: 1.2 }}>
            RESULT
          </AppText>
          <AppText variant="h2" style={{ marginTop: 4, textAlign: "center" }}>
            {title}
          </AppText>
        </View>
        <Animated.View entering={FadeIn.duration(240)}>
          <View style={[styles.resultCard, result.passed ? styles.pass : styles.fail]}>
            <AppText style={styles.resultScore}>
              {result.score}
              <AppText style={{ fontSize: 18, color: "rgba(255,255,255,0.7)" }}> / {result.max_score}</AppText>
            </AppText>
            <AppText style={styles.resultLabel}>{result.passed ? "Passed — great work 🎉" : "Not passed yet"}</AppText>
            <AppText style={styles.resultDetail}>
              {result.correct} of {result.total} correct
            </AppText>
          </View>
        </Animated.View>
        <View style={styles.resultActions}>
          <Button label="Retake quiz" onPress={() => void start()} full />
        </View>
      </Screen>
    );
  }

  const { start: s } = phase;
  const answered = s.questions.filter((q) => answers[q.id] !== undefined).length;

  return (
    <Screen scroll>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(answered / Math.max(s.questions.length, 1)) * 100}%` }]} />
      </View>
      <AppText variant="caption" style={{ color: colors.ink[500], marginTop: 8, textAlign: "center" }}>
        {answered}/{s.questions.length} answered · pass ≥ {s.pass_threshold}%
      </AppText>

      {s.questions.map((q, qi) => (
        <Animated.View key={q.id} entering={FadeIn.delay(qi * 40).duration(240)}>
          <View style={styles.questionCard}>
            <AppText variant="h3">
              <AppText style={{ color: colors.goldDark }}>{qi + 1}.</AppText> {q.question}
            </AppText>
            <View style={styles.options}>
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <Button
                    key={oi}
                    label={`${String.fromCharCode(65 + oi)}. ${opt}`}
                    variant={selected ? "primary" : "secondary"}
                    full
                    style={{ marginBottom: 8 }}
                    onPress={() => {
                      void Haptics.selectionAsync().catch(() => {});
                      setAnswers((a) => ({ ...a, [q.id]: oi }));
                    }}
                  />
                );
              })}
            </View>
          </View>
        </Animated.View>
      ))}

      <View style={{ marginTop: 8 }}>
        <Button label={`Submit (${answered}/${s.questions.length})`} full disabled={answered < s.questions.length} onPress={() => void submit()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  centerTop: { alignItems: "center", marginBottom: 20 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: colors.ink[100], overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: colors.gold, borderRadius: 3 },
  questionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 18,
    marginTop: 18,
    ...shadow.md,
  },
  options: { marginTop: 14 },
  resultCard: {
    borderRadius: radius.lg,
    padding: 28,
    alignItems: "center",
  },
  pass: { backgroundColor: colors.navy },
  fail: { backgroundColor: "#5B3A0E" },
  resultScore: { fontSize: 46, fontWeight: "800", color: colors.white },
  resultLabel: { color: colors.gold, fontWeight: "700", fontSize: 16, marginTop: 8, textAlign: "center" },
  resultDetail: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4 },
  resultActions: { marginTop: 24 },
});
