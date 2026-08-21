import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { WizardStepper } from "@/src/components/WizardStepper";
import { useTheme } from "@/src/lib/theme-context";
import { getDraft, setDraft, LEVELS, TUTOR_SUBJECTS } from "@/src/lib/wizard-draft";

// Wizard step 2 — profile: parent adds their first learner; students pick a
// level; tutors pick their strongest subject. Draft persists between steps.

function midLabel(role: string): string {
  if (role === "PARENT") return "Your learner";
  if (role === "STUDENT") return "Your level";
  return "Your subjects";
}

export default function WizardProfile() {
  const { colors } = useTheme();
  const [role, setRole] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [level, setLevel] = useState("");
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
        setReady(true);
      })();
    }, [])
  );

  if (!ready || !role) {
    return null;
  }

  const isParent = role === "PARENT";
  const isStudent = role === "STUDENT";
  const options = isStudent ? LEVELS : TUTOR_SUBJECTS;

  const continueToGoals = async () => {
    if (isParent && !firstName.trim()) return;
    await setDraft({ role, firstName: firstName.trim(), level, goals: (await getDraft()).goals });
    router.push("/wizard/goals" as never);
  };

  return (
    <Screen scroll>
      <WizardStepper step={1} labels={["Welcome", midLabel(role), "Goals"]} />

      <Animated.View entering={FadeInUp.delay(60).springify().damping(16)}>
        <AppText variant="h1">
          {isParent ? "Add your first learner" : isStudent ? "What level are you at?" : "What do you teach?"}
        </AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 6, lineHeight: 20 }}>
          {isParent
            ? "We use their level to recommend cohorts, programmes and tutors."
            : isStudent
            ? "Recommendations and quizzes tune to your level."
            : "Tell us your strongest area to order your onboarding."}
        </AppText>
      </Animated.View>

      {isParent && (
        <Animated.View entering={FadeInUp.delay(140).springify().damping(16)}>
          <AppText variant="label" style={styles.fieldLabel}>FIRST NAME</AppText>
          <AppInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="e.g. Kemi"
            autoComplete="given-name"
          />
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(180).springify().damping(16)}>
        {!isParent && <AppText variant="label" style={styles.fieldLabel}>CURRENT LEVEL / SUBJECT</AppText>}
        <View style={styles.pills}>
          {options.map((opt) => (
            <Card
              key={opt}
              onPress={() => setLevel(opt)}
              padded
              style={level === opt ? { ...styles.pill, backgroundColor: colors.green } : styles.pill}
            >
              <AppText variant="caption" style={{ color: level === opt ? colors.ink[950] : colors.ink[600], fontWeight: "700" }}>
                {opt}
              </AppText>
            </Card>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(260).springify().damping(16)} style={{ marginTop: 8 }}>
        <View style={styles.rowBtns}>
          <Button label="Back" variant="ghost" onPress={() => router.replace("/wizard" as never)} />
          <View style={{ flex: 1 }}>
            <Button
              label="Continue"
              full
              disabled={isParent && !firstName.trim()}
              onPress={() => void continueToGoals()}
            />
          </View>
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { letterSpacing: 1, fontSize: 12, marginTop: 18, marginBottom: 8 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: { paddingVertical: 9, paddingHorizontal: 14 },
  rowBtns: { flexDirection: "row", alignItems: "center", marginTop: 24, gap: 8 },
});
