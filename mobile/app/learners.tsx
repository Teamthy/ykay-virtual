import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { createLearner, listLearners, type Learner } from "@/src/lib/account";

// Learners — the children/students linked to this account (GET/POST
// /me/learners). A minor (under 17) must be linked to a parent or guardian to
// enrol.

const LEVELS = ["Year 7–9 (British)", "IGCSE (Year 10–11)", "A-Level (Year 12–13)", "JSS1–3 (Nigerian)", "SSS1–3 (Nigerian)", "Adult / professional"] as const;

export default function LearnersScreen() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [relationship, setRelationship] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLearners(await listLearners());
    } catch {
      setLearners([]);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const add = async () => {
    if (!firstName.trim()) {
      return Alert.alert("Missing name", "Enter the learner's first name.");
    }
    setBusy(true);
    try {
      await createLearner({
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        date_of_birth: dob.trim() || undefined,
        current_level: level,
        relationship: relationship.trim() || undefined,
      });
      setFirstName("");
      setLastName("");
      setDob("");
      setRelationship("");
      setShowForm(false);
      await load();
    } catch (e) {
      Alert.alert("Could not add learner", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Account"
        title="Learners"
        subtitle="The children and students linked to your account."
      />

      {learners.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No learners linked yet. Add one below.
          </AppText>
        </Card>
      ) : (
        learners.map((l) => (
          <Card key={l.id} padded style={styles.row}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={16} color={colors.navy} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="h3">
                {l.first_name} {l.last_name ?? ""}
              </AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                {l.current_level ?? "Level not set"}
                {l.relationship ? ` · ${l.relationship}` : ""}
              </AppText>
            </View>
          </Card>
        ))
      )}

      {showForm ? (
        <Card padded style={{ marginTop: 16 }}>
          <AppText variant="h3">Add a learner</AppText>
          <View style={{ height: 12 }} />
          <AppInput label="First name *" value={firstName} onChangeText={setFirstName} editable={!busy} autoComplete="given-name" />
          <AppInput label="Last name" value={lastName} onChangeText={setLastName} editable={!busy} autoComplete="family-name" />
          <AppInput label="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} editable={!busy} placeholder="2012-05-14" autoCapitalize="none" />
          <AppText variant="label" style={{ marginBottom: 6 }}>Current level</AppText>
          <View style={styles.chips}>
            {LEVELS.map((lv) => (
              <Card
                key={lv}
                onPress={() => setLevel(lv)}
                padded
                style={level === lv ? { ...styles.chip, backgroundColor: colors.gold } : styles.chip}
              >
                <AppText variant="caption" style={{ color: level === lv ? colors.ink[900] : colors.ink[600], fontWeight: "700" }}>
                  {lv}
                </AppText>
              </Card>
            ))}
          </View>
          <AppInput label="Relationship (e.g. Parent, Guardian)" value={relationship} onChangeText={setRelationship} editable={!busy} />
          <View style={{ height: 8 }} />
          <Button label="Add learner" loading={busy} full onPress={() => void add()} />
        </Card>
      ) : (
        <View style={{ marginTop: 16 }}>
          <Button label="Add a learner" variant="secondary" full onPress={() => setShowForm(true)} />
        </View>
      )}

      <AppText variant="caption" style={{ color: colors.ink[400], textAlign: "center", marginTop: 16 }}>
        A minor (under 17) must be linked to a parent or guardian to enrol.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 10 },
});
