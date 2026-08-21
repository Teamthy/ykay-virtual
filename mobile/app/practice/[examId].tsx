import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { LoaderScreen } from "@/src/components/ui/LoaderScreen";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing, type } from "@/src/lib/theme";
import {
  getAttemptReview,
  getPracticePaper,
  startPracticeAttempt,
  submitPracticeAttempt,
  type AttemptReview,
  type PracticePaper,
  type PracticePaperQuestion,
} from "@/src/lib/api";

// CBT exam player — one question at a time, palette navigation, countdown
// timer, auto-submit on expiry, instant score + marked-paper review.

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"] as const;

function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PracticePlayer() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { colors } = useTheme();

  const [paper, setPaper] = useState<PracticePaper | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [review, setReview] = useState<AttemptReview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const p = await getPracticePaper(examId);
      setPaper(p);
      const a = await startPracticeAttempt(examId);
      setAttemptId(a.attempt_id);
      setExpiresAt(new Date(a.expires_at).getTime());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start this exam");
    }
  }, [examId]);

  useFocusEffect(
    useCallback(() => {
      if (!paper && !error) void load();
    }, [load, paper, error])
  );

  // Countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const remaining = expiresAt ? expiresAt - now : 0;
  const expired = expiresAt !== null && remaining <= 0;

  const submit = useCallback(
    async (auto: boolean) => {
      if (!attemptId || submittedRef.current || submitting) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const res = await submitPracticeAttempt(attemptId, answersRef.current);
        const full = await getAttemptReview(attemptId);
        setReview({ ...full, expired: res.expired });
      } catch (e) {
        submittedRef.current = false;
        setError(e instanceof Error ? e.message : "Could not submit your answers");
      } finally {
        setSubmitting(false);
      }
    },
    [attemptId, submitting]
  );

  // Auto-submit on expiry
  useEffect(() => {
    if (expired && attemptId && !submittedRef.current) void submit(true);
  }, [expired, attemptId, submit]);

  const questions = paper?.questions ?? [];
  const q: PracticePaperQuestion | undefined = questions[index];
  const chosen = q ? answers[q.id] : undefined;
  const unanswered = questions.filter((qq) => answers[qq.id] === undefined).length;

  const confirmSubmit = () => {
    if (unanswered > 0) {
      Alert.alert(
        unanswered === 1 ? "1 question unanswered" : `${unanswered} questions unanswered`,
        "Unanswered questions score zero. Submit anyway?",
        [
          { text: "Keep working", style: "cancel" },
          { text: "Submit", style: "destructive", onPress: () => void submit(false) },
        ]
      );
    } else {
      Alert.alert("Submit exam?", "Your answers will be marked immediately.", [
        { text: "Keep working", style: "cancel" },
        { text: "Submit", onPress: () => void submit(false) },
      ]);
    }
  };

  const selectOption = (optIdx: number) => {
    if (!q || submitting || review) return;
    setAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
  };

  // ---------- states ----------
  if (!paper && !error) {
    return <LoaderScreen label="Preparing your exam" />;
  }
  if (error && !paper) {
    return (
      <Screen scroll>
        <ErrorState title="Couldn't start the exam" message={error} onRetry={() => { setError(null); void load(); }} />
      </Screen>
    );
  }
  if (!paper) return <LoaderScreen label="Preparing your exam" />;

  // ---------- result ----------
  if (review) {
    return (
      <Screen scroll>
        <Animated.View entering={FadeIn.duration(240)}>
          <Card style={styles.resultCard}>
            <View style={[styles.scoreBadge, { backgroundColor: review.passed ? colors.greenLight : colors.ink[100] }]}>
              <AppText variant="display" style={{ color: review.passed ? colors.greenDark : colors.danger }}>
                {review.score}%
              </AppText>
            </View>
            <AppText variant="h1" style={{ textAlign: "center", marginTop: spacing.md }}>
              {review.passed ? "Well done — you passed!" : "Not this time"}
            </AppText>
            <AppText variant="bodySm" style={{ textAlign: "center", color: colors.ink[500], marginTop: 6 }}>
              {review.correct} of {review.total} correct · pass mark {review.passing_score}%
              {review.expired ? " · time ran out — submitted automatically" : ""}
            </AppText>
          </Card>
        </Animated.View>

        <AppText variant="label" style={styles.section}>
          MARKED PAPER
        </AppText>
        {review.questions.map((rq, i) => {
          const isCorrect = rq.chosen_index === rq.correct_index;
          return (
            <Animated.View key={rq.id} entering={FadeIn.delay(i * 40).duration(240)}>
              <Card style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <AppText variant="label" style={{ color: isCorrect ? colors.greenDark : colors.danger }}>
                    Q{rq.position} · {isCorrect ? "Correct" : "Wrong"}
                  </AppText>
                </View>
                <AppText variant="heading" style={{ marginTop: 4 }}>
                  {rq.text}
                </AppText>
                {rq.options.map((opt, oi) => {
                  const isChosen = rq.chosen_index === oi;
                  const isRight = rq.correct_index === oi;
                  return (
                    <View
                      key={oi}
                      style={[
                        styles.reviewOption,
                        {
                          borderColor: isRight ? colors.greenDark : isChosen ? colors.danger : colors.border,
                          backgroundColor: isRight ? colors.greenLight : isChosen ? colors.ink[100] : "transparent",
                        },
                      ]}
                    >
                      <AppText variant="label" style={{ color: colors.ink[700] }}>
                        {OPTION_LABELS[oi]}. {opt}
                      </AppText>
                    </View>
                  );
                })}
                {rq.explanation ? (
                  <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: spacing.sm }}>
                    {rq.explanation}
                  </AppText>
                ) : null}
              </Card>
            </Animated.View>
          );
        })}

        <Button label="Back to practice" full style={{ marginTop: spacing.lg }} onPress={() => router.replace("/practice" as never)} />
      </Screen>
    );
  }

  // ---------- player ----------
  return (
    <Screen scroll={false}>
      <View style={styles.playerRoot}>
        {/* Timer + progress bar */}
        <View style={[styles.timerBar, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.timerFill,
              {
                backgroundColor: remaining < 60000 ? colors.danger : colors.greenDark,
                width: `${expiresAt ? Math.max(0, Math.min(100, (remaining / (paper.duration_minutes * 60000)) * 100)) : 100}%`,
              },
            ]}
          />
        </View>
        <View style={styles.playerMeta}>
          <AppText variant="label" style={{ color: colors.ink[500] }}>
            QUESTION {index + 1} OF {questions.length}
          </AppText>
          <AppText variant="h3" style={{ color: remaining < 60000 ? colors.danger : colors.deep }}>
            {fmtClock(remaining)}
          </AppText>
        </View>

        {/* Question */}
        {q && (
          <View style={styles.questionWrap}>
            <AppText variant="h2">{q.text}</AppText>
            {q.options.map((opt, oi) => {
              const active = chosen === oi;
              return (
                <Pressable
                  key={oi}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => selectOption(oi)}
                  style={[
                    styles.option,
                    { borderColor: active ? colors.greenDark : colors.border, backgroundColor: active ? colors.greenLight : colors.surface },
                  ]}
                >
                  <View style={[styles.optionLabel, { backgroundColor: active ? colors.greenDark : colors.ink[100] }]}>
                    <AppText variant="label" style={{ color: active ? colors.white : colors.ink[700] }}>
                      {OPTION_LABELS[oi]}
                    </AppText>
                  </View>
                  <AppText variant="body" style={{ flex: 1, color: colors.ink[800] }}>
                    {opt}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Palette */}
        <View style={styles.palette}>
          {questions.map((qq, i) => {
            const answered = answers[qq.id] !== undefined;
            const current = i === index;
            return (
              <Pressable
                key={qq.id}
                accessibilityRole="button"
                accessibilityLabel={`Question ${i + 1}${answered ? ", answered" : ""}`}
                onPress={() => setIndex(i)}
                style={[
                  styles.paletteItem,
                  {
                    backgroundColor: current ? colors.deep : answered ? colors.greenLight : colors.surface,
                    borderColor: current ? colors.deep : colors.border,
                  },
                ]}
              >
                <AppText variant="label" style={{ color: current ? colors.white : answered ? colors.greenDark : colors.ink[500] }}>
                  {i + 1}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Button
            label="Previous"
            variant="ghost"
            disabled={index === 0}
            style={{ flex: 1 }}
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
          />
          {index < questions.length - 1 ? (
            <Button label="Next" style={{ flex: 1 }} onPress={() => setIndex((i) => Math.min(questions.length - 1, i + 1))} />
          ) : (
            <Button label={submitting ? "Submitting…" : "Submit exam"} variant="dark" loading={submitting} style={{ flex: 1 }} onPress={confirmSubmit} />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  playerRoot: { flex: 1 },
  timerBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: spacing.sm },
  timerFill: { height: "100%", borderRadius: 3 },
  playerMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  questionWrap: { flex: 1 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  optionLabel: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  palette: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.lg },
  paletteItem: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  resultCard: { alignItems: "center", paddingVertical: spacing.xxl },
  scoreBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { color: "#888", letterSpacing: 1.1, marginTop: spacing.xxl, marginBottom: spacing.sm },
  reviewCard: { marginBottom: spacing.sm },
  reviewTop: { flexDirection: "row", justifyContent: "space-between" },
  reviewOption: {
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
});
