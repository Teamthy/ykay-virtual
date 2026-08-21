import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { AppInput } from "@/src/components/ui/AppInput";
import { useTheme } from "@/src/lib/theme-context";
import { spacing } from "@/src/lib/theme";
import { createTutorExam } from "@/src/lib/api";

// Exam builder — school/college style paper authoring: subject, duration,
// pass mark and questions with 2-6 options, one correct answer each.

type DraftQuestion = {
  text: string;
  options: string[]; // 4 by default
  correct: number; // index
  explanation?: string;
};

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"] as const;

function emptyQuestion(): DraftQuestion {
  return { text: "", options: ["", "", "", ""], correct: 0, explanation: "" };
}

export default function NewExam() {
  const { colors } = useTheme();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [passing, setPassing] = useState("60");
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [busy, setBusy] = useState(false);

  const setQ = (i: number, patch: Partial<DraftQuestion>) => {
    setQuestions((qs) => qs.map((q, qi) => (qi === i ? { ...q, ...patch } : q)));
  };

  const setOption = (qi: number, oi: number, value: string) => {
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? value : o)) } : q)));
  };

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);
  const removeQuestion = (i: number) => setQuestions((qs) => (qs.length > 1 ? qs.filter((_, qi) => qi !== i) : qs));
  const addOption = (qi: number) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi && q.options.length < 6 ? { ...q, options: [...q.options, ""] } : q)));
  const removeOption = (qi: number, oi: number) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi && q.options.length > 2 ? { ...q, options: q.options.filter((_, j) => j !== oi), correct: q.correct === oi ? 0 : q.correct > oi ? q.correct - 1 : q.correct } : q)));

  const save = async () => {
    const dur = Number(duration);
    const pass = Number(passing);
    if (!subject.trim() || !title.trim()) {
      return Alert.alert("Missing details", "Add a subject and a title.");
    }
    if (!Number.isFinite(dur) || dur < 1 || dur > 180) {
      return Alert.alert("Duration", "Duration must be 1-180 minutes.");
    }
    if (!Number.isFinite(pass) || pass < 0 || pass > 100) {
      return Alert.alert("Pass mark", "Pass mark must be 0-100.");
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return Alert.alert("Question " + (i + 1), "Question text is required.");
      if (q.options.some((o) => !o.trim())) return Alert.alert("Question " + (i + 1), "Fill in every option.");
    }
    setBusy(true);
    try {
      await createTutorExam({
        subject: subject.trim(),
        title: title.trim(),
        description: description.trim(),
        duration_minutes: dur,
        passing_score: pass,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          options: q.options.map((o) => o.trim()),
          correct_index: q.correct,
          explanation: q.explanation?.trim() ?? "",
        })),
      });
      router.replace("/tutor/exams" as never);
    } catch (e) {
      Alert.alert("Couldn't save the exam", e instanceof Error ? e.message : "Please try again.");
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenHeader
          eyebrow="NEW CBT PAPER"
          title="Create exam"
          subtitle="Set the paper, then add questions — one correct answer each. Students see instant auto-marked results."
        />

        <Card style={styles.section}>
          <AppText variant="label" style={{ marginBottom: spacing.sm }}>
            PAPER DETAILS
          </AppText>
          <AppInput label="Subject" placeholder="e.g. Mathematics" value={subject} onChangeText={setSubject} />
          <AppInput label="Title" placeholder="e.g. Algebra CBT drill — term 1" value={title} onChangeText={setTitle} />
          <AppInput label="Description (optional)" placeholder="What this paper covers" value={description} onChangeText={setDescription} multiline />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppInput label="Duration (min)" placeholder="30" keyboardType="number-pad" value={duration} onChangeText={setDuration} />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput label="Pass mark (%)" placeholder="60" keyboardType="number-pad" value={passing} onChangeText={setPassing} />
            </View>
          </View>
        </Card>

        {questions.map((q, qi) => (
          <Card key={qi} style={styles.section}>
            <View style={styles.qHeader}>
              <AppText variant="h3">Question {qi + 1}</AppText>
              <Ionicons
                name="trash-outline"
                size={18}
                color={colors.ink[300]}
                accessibilityLabel={`Remove question ${qi + 1}`}
                onPress={() => removeQuestion(qi)}
              />
            </View>
            <AppInput label="Question text" placeholder="Type the question…" value={q.text} onChangeText={(t) => setQ(qi, { text: t })} multiline />
            {q.options.map((opt, oi) => (
              <View key={oi} style={styles.optionRow}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: q.correct === oi }}
                  accessibilityLabel={`Option ${OPTION_LABELS[oi]} is correct`}
                  onPress={() => setQ(qi, { correct: oi })}
                  style={[
                    styles.correctDot,
                    { borderColor: q.correct === oi ? colors.greenDark : colors.border, backgroundColor: q.correct === oi ? colors.greenDark : "transparent" },
                  ]}
                >
                  {q.correct === oi ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <AppInput label={`Option ${OPTION_LABELS[oi]}`} placeholder={`Option ${OPTION_LABELS[oi]}`} value={opt} onChangeText={(v) => setOption(qi, oi, v)} />
                </View>
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={colors.ink[300]}
                  accessibilityLabel={`Remove option ${OPTION_LABELS[oi]}`}
                  onPress={() => removeOption(qi, oi)}
                />
              </View>
            ))}
            {q.options.length < 6 && (
              <Button label="Add option" variant="ghost" onPress={() => addOption(qi)} />
            )}
            <AppInput label="Explanation (shown after marking)" placeholder="Optional — why the correct answer is right" value={q.explanation} onChangeText={(t) => setQ(qi, { explanation: t })} multiline />
          </Card>
        ))}

        <Button label="Add question" variant="secondary" full onPress={addQuestion} style={{ marginBottom: spacing.lg }} />
        <Button label={busy ? "Publishing…" : "Publish exam"} full loading={busy} onPress={() => void save()} />
        <View style={{ height: spacing.xxl }} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm },
  qHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  optionRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  correctDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
});
