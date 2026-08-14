import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Quiz player — standard-LMS attempt flow (M4):
// start → single-attempt question set → auto-grade on submit → result.
// The learner profile resolves from the bearer session (G1.2).

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
    const unanswered = phase.start.questions.filter((q) => answers[q.id] === undefined).length;
    setPhase({ kind: "submitting" });
    try {
      const res = await apiFetch<Result>(`/learning/assessments/${assessmentId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          answers: Object.entries(answers).map(([question_id, chosen_index]) => ({ question_id, chosen_index })),
        }),
      });
      setPhase({ kind: "done", result: res.data, title: phase.start.title });
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : "Could not submit the quiz" });
    }
    void unanswered;
  };

  if (phase.kind === "loading" || phase.kind === "submitting") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.centerText}>{phase.kind === "submitting" ? "Grading your answers…" : "Preparing your quiz…"}</Text>
      </View>
    );
  }

  if (phase.kind === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{phase.message}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => void start()}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (phase.kind === "done") {
    const { result, title } = phase;
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.resultCard, result.passed ? styles.resultPass : styles.resultFail]}>
          <Text style={styles.resultScore}>
            {result.score}/{result.max_score}
          </Text>
          <Text style={styles.resultLabel}>{result.passed ? "Passed 🎉" : "Not passed — review and retry with your tutor"}</Text>
          <Text style={styles.resultDetail}>
            {result.correct} of {result.total} correct
          </Text>
        </View>
        <Pressable style={styles.primaryBtn} onPress={() => void start()}>
          <Text style={styles.primaryBtnText}>Retake quiz</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const { start: s } = phase;
  const answered = s.questions.filter((q) => answers[q.id] !== undefined).length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{s.title}</Text>
      <Text style={styles.sub}>
        {answered}/{s.questions.length} answered · pass ≥ {s.pass_threshold}%
      </Text>

      {s.questions.map((q, qi) => (
        <View key={q.id} style={styles.questionCard}>
          <Text style={styles.question}>
            {qi + 1}. {q.question}
          </Text>
          {q.options.map((opt, oi) => {
            const selected = answers[q.id] === oi;
            return (
              <Pressable
                key={oi}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {String.fromCharCode(65 + oi)}. {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      <Pressable
        style={[styles.primaryBtn, answered < s.questions.length && styles.primaryBtnDisabled]}
        onPress={() => void submit()}
        disabled={answered < s.questions.length}
      >
        <Text style={styles.primaryBtnText}>
          {answered < s.questions.length ? `Answer all questions (${answered}/${s.questions.length})` : "Submit quiz"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.cream },
  centerText: { marginTop: 12, color: colors.ink[500] },
  title: { fontSize: 22, fontWeight: "800", color: colors.navy },
  sub: { fontSize: 13, color: colors.ink[500], marginTop: 6, marginBottom: 20 },
  questionCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E8E4DA", padding: 16, marginBottom: 16 },
  question: { fontSize: 15, fontWeight: "700", color: colors.ink[900], marginBottom: 12, lineHeight: 21 },
  option: { borderWidth: 1, borderColor: "#B8B2A6", borderRadius: radius.md, padding: 12, marginBottom: 8 },
  optionSelected: { borderColor: colors.gold, backgroundColor: colors.goldLight },
  optionText: { fontSize: 14, color: colors.ink[700] },
  optionTextSelected: { fontWeight: "700", color: colors.ink[900] },
  error: { color: colors.danger, textAlign: "center", marginBottom: 16 },
  primaryBtn: { backgroundColor: colors.gold, borderRadius: radius.md, padding: 16, alignItems: "center", marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: colors.ink[900], fontWeight: "800", fontSize: 15 },
  resultCard: { borderRadius: radius.lg, padding: 24, alignItems: "center", marginBottom: 20 },
  resultPass: { backgroundColor: "#E8F7EE" },
  resultFail: { backgroundColor: "#FDECEC" },
  resultScore: { fontSize: 44, fontWeight: "800", color: colors.navy },
  resultLabel: { fontSize: 16, fontWeight: "700", marginTop: 6, color: colors.ink[800] },
  resultDetail: { fontSize: 13, color: colors.ink[500], marginTop: 6 },
});
