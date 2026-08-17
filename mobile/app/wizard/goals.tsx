import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { WizardStepper } from "@/src/components/WizardStepper";
import { colors } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";
import { clearDraft, getDraft, GOALS } from "@/src/lib/wizard-draft";

// Wizard step 3 — Goals. Pick as many as you like, then finish: parents get a
// learner created, and /auth/me/onboarded marks the account done (idempotent).

function midLabel(role: string): string {
  if (role === "PARENT") return "Your learner";
  if (role === "STUDENT") return "Your level";
  return "Your subjects";
}

export default function WizardGoals() {
  const [role, setRole] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [level, setLevel] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const draft = await getDraft();
        if (!draft.role) {
          router.replace("/wizard");
          return;
        }
        setRole(draft.role);
        setFirstName(draft.firstName);
        setLevel(draft.level);
        setGoals(draft.goals);
        setReady(true);
      })();
    }, [])
  );

  if (!ready || !role) {
    return null;
  }

  const isParent = role === "PARENT";

  const toggleGoal = (id: string) => {
    setGoals((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isParent && firstName.trim()) {
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
      await clearDraft();
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <WizardStepper step={2} labels={["Welcome", midLabel(role), "Goals"]} />

      <Animated.View entering={FadeInUp.delay(60).springify().damping(16)}>
        <AppText variant="h1">What are your goals?</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 6, lineHeight: 20 }}>
          Pick as many as you like — they shape your “For you” feed.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).springify().damping(16)} style={{ marginTop: 16 }}>
        {GOALS.map((g) => {
          const active = goals.includes(g.id);
          return (
            <Card
              key={g.id}
              onPress={() => toggleGoal(g.id)}
              padded
              style={active ? { ...styles.goal, borderColor: colors.gold, backgroundColor: colors.goldLight } : styles.goal}
            >
              <Ionicons name={g.icon as keyof typeof Ionicons.glyphMap} size={20} color={active ? colors.ink[900] : colors.ink[500]} />
              <AppText variant="body" style={{ color: active ? colors.ink[900] : colors.ink[600], fontWeight: "600", marginLeft: 12, flex: 1 }}>
                {g.label}
              </AppText>
              <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={20} color={active ? colors.goldDark : colors.ink[300]} />
            </Card>
          );
        })}
      </Animated.View>

      {error ? <AppText variant="bodySm" style={{ color: colors.danger, marginTop: 12 }}>{error}</AppText> : null}

      <Animated.View entering={FadeInUp.delay(240).springify().damping(16)} style={{ marginTop: 24 }}>
        <View style={styles.rowBtns}>
          <Button label="Back" variant="ghost" onPress={() => router.replace("/wizard/profile" as never)} />
          <View style={{ flex: 1 }}>
            <Button label={saving ? "Saving…" : "Finish"} full loading={saving} onPress={() => void finish()} />
          </View>
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  goal: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E4DA",
    marginBottom: 10,
  },
  rowBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
});
