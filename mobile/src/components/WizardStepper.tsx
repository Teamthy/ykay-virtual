import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/src/lib/theme";

// WizardStepper — the 3-step progress indicator shared by the wizard routes.

type Props = {
  step: 0 | 1 | 2;
  labels: [string, string, string];
};

export function WizardStepper({ step, labels }: Props) {
  return (
    <View style={styles.stepper}>
      {labels.map((label, i) => (
        <View key={label} style={styles.stepWrap}>
          <View style={[styles.stepBar, i <= step && styles.stepBarActive]} />
          <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>
            {i + 1}. {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: "row", gap: 8, marginBottom: 28 },
  stepWrap: { flex: 1 },
  stepBar: { height: 6, borderRadius: 3, backgroundColor: "#E8E4DA" },
  stepBarActive: { backgroundColor: colors.gold },
  stepLabel: { fontSize: 10, fontWeight: "700", color: colors.ink[400], marginTop: 6 },
  stepLabelActive: { color: colors.ink[900] },
});
