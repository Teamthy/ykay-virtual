import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// First-time 3-step wizard (mirrors the web wizard): Welcome → profile
// setup (learner for parents, level for students, subject for tutors) →
// goals → POST /auth/me/onboarded → role home. Idempotent.

type Me = { id: string; email: string; roles: string[]; onboarded: boolean; first_name?: string };

const GOALS = [
  { id: "exams", label: "Exam success (UTME · IGCSE · WAEC)", icon: "📝" },
  { id: "grades", label: "Better school grades", icon: "📈" },
  { id: "confidence", label: "Confidence & study habits", icon: "💪" },
  { id: "abroad", label: "Studying abroad", icon: "✈️" },
  { id: "digital", label: "Digital & tech skills", icon: "💻" },
];

const LEVELS = ["Primary", "JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3", "IGCSE", "A Level"];

export default function Wizard() {
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [level, setLevel] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<Me>("/auth/me");
        if (cancelled) return;
        const u = res.data;
        setMe(u);
        if (u.onboarded) {
          router.replace("/home");
          return;
        }
      } catch {
        router.replace("/login");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isParent = !!me?.roles.includes("PARENT");
  const isStudent = !!me?.roles.includes("STUDENT");

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isParent && step === 1 && firstName.trim()) {
        await apiFetch("/me/learners", {
          method: "POST",
          body: JSON.stringify({
            first_name: firstName.trim(),
            last_name: "",
            date_of_birth: "2013-01-01",
            current_level: level || undefined,
            relationship: "PARENT",
          }),
        }).catch(() => undefined);
      }
      await apiFetch("/auth/me/onboarded", { method: "POST" });
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  const roleLabel = isParent ? "parent" : isStudent ? "learner" : "educator";

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Stepper */}
      <View style={styles.stepper}>
        {["Welcome", isParent ? "Your learner" : isStudent ? "Your level" : "Your subjects", "Goals"].map((label, i) => (
          <View key={label} style={styles.stepWrap}>
            <View style={[styles.stepBar, i <= step && styles.stepBarActive]} />
            <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>
              {i + 1}. {label}
            </Text>
          </View>
        ))}
      </View>

      {step === 0 && (
        <View>
          <Text style={styles.title}>Welcome{me?.first_name ? `, ${me.first_name}` : ""} 👋</Text>
          <Text style={styles.body}>
            You&apos;re signed in as a {roleLabel}. Two quick steps to personalise your
            dashboard, recommendations and notifications.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => setStep(1)}>
            <Text style={styles.primaryText}>Continue</Text>
          </Pressable>
        </View>
      )}

      {step === 1 && isParent && (
        <View>
          <Text style={styles.title}>Add your first learner</Text>
          <Text style={styles.body}>We use their level to recommend cohorts, programmes and tutors.</Text>
          <Text style={styles.inputLabel}>FIRST NAME</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="e.g. Kemi"
            placeholderTextColor={colors.ink[400]}
            style={styles.input}
          />
          <Text style={styles.inputLabel}>CURRENT LEVEL</Text>
          <View style={styles.pillWrap}>
            {LEVELS.map((l) => (
              <Pressable key={l} onPress={() => setLevel(l)} style={[styles.pill, level === l && styles.pillActive]}>
                <Text style={[styles.pillText, level === l && styles.pillTextActive]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.rowBtns}>
            <Pressable style={styles.ghostBtn} onPress={() => setStep(0)}>
              <Text style={styles.ghostText}>Back</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, styles.rowBtn, !firstName.trim() && styles.disabled]}
              disabled={!firstName.trim()}
              onPress={() => setStep(2)}
            >
              <Text style={styles.primaryText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 1 && !isParent && (
        <View>
          <Text style={styles.title}>{isStudent ? "What level are you at?" : "What do you teach?"}</Text>
          <Text style={styles.body}>
            {isStudent
              ? "Recommendations and quizzes tune to your level."
              : "Tell us your strongest area to order your onboarding."}
          </Text>
          <View style={styles.pillWrap}>
            {(isStudent ? LEVELS : ["Mathematics", "English", "Sciences", "Computer Science", "Exam Prep"]).map((l) => (
              <Pressable key={l} onPress={() => setLevel(l)} style={[styles.pill, level === l && styles.pillActive]}>
                <Text style={[styles.pillText, level === l && styles.pillTextActive]}>{l}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.rowBtns}>
            <Pressable style={styles.ghostBtn} onPress={() => setStep(0)}>
              <Text style={styles.ghostText}>Back</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, styles.rowBtn]} onPress={() => setStep(2)}>
              <Text style={styles.primaryText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.title}>What are your goals?</Text>
          <Text style={styles.body}>Pick as many as you like — they shape your “For you” feed.</Text>
          <View style={styles.goalWrap}>
            {GOALS.map((g) => {
              const active = goals.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setGoals((prev) => (active ? prev.filter((x) => x !== g.id) : [...prev, g.id]))}
                  style={[styles.goalCard, active && styles.goalActive]}
                >
                  <Text style={[styles.goalText, active && styles.goalTextActive]}>
                    {g.icon}  {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.rowBtns}>
            <Pressable style={styles.ghostBtn} onPress={() => setStep(1)}>
              <Text style={styles.ghostText}>Back</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, styles.rowBtn, saving && styles.disabled]} disabled={saving} onPress={() => void finish()}>
              <Text style={styles.primaryText}>{saving ? "Saving…" : "Finish"}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  stepper: { flexDirection: "row", gap: 8, marginBottom: 28 },
  stepWrap: { flex: 1 },
  stepBar: { height: 6, borderRadius: 3, backgroundColor: "#E8E4DA" },
  stepBarActive: { backgroundColor: colors.gold },
  stepLabel: { fontSize: 10, fontWeight: "700", color: colors.ink[400], marginTop: 6 },
  stepLabelActive: { color: colors.ink[900] },
  title: { fontSize: 24, fontWeight: "800", color: colors.navy },
  body: { fontSize: 14, color: colors.ink[600], marginTop: 8, marginBottom: 20, lineHeight: 21 },
  inputLabel: { fontSize: 11, fontWeight: "800", color: colors.ink[500], marginTop: 14, letterSpacing: 1 },
  input: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: "#E8E4DA", padding: 14, marginTop: 8, fontSize: 15 },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: { borderWidth: 1, borderColor: "#E8E4DA", borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillText: { fontSize: 13, fontWeight: "700", color: colors.ink[600] },
  pillTextActive: { color: colors.ink[900] },
  rowBtns: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24 },
  rowBtn: { marginTop: 0, flex: 1, marginLeft: 12 },
  primaryBtn: { backgroundColor: colors.gold, borderRadius: radius.md, padding: 16, alignItems: "center", marginTop: 20 },
  primaryText: { color: colors.ink[900], fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.5 },
  ghostBtn: { padding: 14 },
  ghostText: { color: colors.ink[600], fontWeight: "700" },
  goalWrap: { gap: 10 },
  goalCard: { borderWidth: 1, borderColor: "#E8E4DA", borderRadius: radius.md, padding: 16, backgroundColor: colors.white },
  goalActive: { borderColor: colors.gold, backgroundColor: colors.goldLight },
  goalText: { fontSize: 14, fontWeight: "600", color: colors.ink[600] },
  goalTextActive: { color: colors.ink[900] },
  error: { color: colors.danger, marginTop: 12 },
});
