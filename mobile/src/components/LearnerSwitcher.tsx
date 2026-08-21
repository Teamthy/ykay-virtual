import { ScrollView, StyleSheet, View } from "react-native";
import { useLearner } from "@/src/lib/learner-context";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing, type } from "@/src/lib/theme";

// LearnerSwitcher — horizontal chips for parents with several children.
// Pinning a learner filters every learner-scoped screen to that child.
// Hidden for accounts with one or zero learners.

export function LearnerSwitcher() {
  const { learners, selectedId, setSelectedId } = useLearner();
  const { colors } = useTheme();

  if (learners.length < 2) return null;

  return (
    <View>
      <AppText variant="label" style={{ color: colors.ink[500], letterSpacing: 1.1, fontSize: type.caption, marginBottom: spacing.xs }}>
        VIEWING
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {learners.map((l) => {
          const active = l.id === selectedId;
          return (
            <View
              key={l.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`View ${l.first_name}'s dashboard`}
              onTouchEnd={() => setSelectedId(l.id)}
              style={[
                styles.chip,
                { backgroundColor: active ? colors.deep : colors.surface, borderColor: active ? colors.deep : colors.border },
              ]}
            >
              <AppText
                variant="label"
                style={{ color: active ? colors.green : colors.ink[600], textTransform: "capitalize" }}
              >
                {l.first_name}
              </AppText>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.xs, paddingBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
});
