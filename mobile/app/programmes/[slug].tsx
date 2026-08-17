import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { formatNaira, getProgramme, type ProgrammeDetail } from "@/src/lib/catalogue";

// Programme detail — the published programme (GET /programmes/{slug}) with
// curriculum/level/exam context, subjects and a next-start hint.

export default function ProgrammeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [programme, setProgramme] = useState<ProgrammeDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setProgramme(await getProgramme(slug));
    } catch {
      setProgramme(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useFocusEffect(useCallback(() => void load(), [load]));

  if (loading) {
    return (
      <Screen scroll>
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 48 }}>
          Loading programme…
        </AppText>
      </Screen>
    );
  }

  if (!programme) {
    return (
      <Screen scroll>
        <AppText variant="h2" style={{ marginTop: 32 }}>Programme not found</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 8 }}>
          This programme may no longer be published.
        </AppText>
      </Screen>
    );
  }

  const meta: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
  if (programme.curriculum_name) meta.push({ icon: "book-outline", label: programme.curriculum_name });
  if (programme.level_name) meta.push({ icon: "layers-outline", label: programme.level_name });
  if (programme.exam_name) meta.push({ icon: "school-outline", label: programme.exam_name });

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <AppText variant="label" style={{ color: colors.goldDark }}>{programme.format.toUpperCase()}</AppText>
        <AppText variant="h1" style={{ color: colors.white, marginTop: 6 }}>{programme.title}</AppText>
        {programme.summary ? (
          <AppText variant="bodySm" style={{ color: "rgba(255,255,255,0.85)", marginTop: 8, lineHeight: 20 }}>
            {programme.summary}
          </AppText>
        ) : null}
      </View>

      {meta.length > 0 && (
        <View style={styles.metaRow}>
          {meta.map((m) => (
            <View key={m.label} style={styles.metaChip}>
              <Ionicons name={m.icon} size={14} color={colors.navy} />
              <AppText variant="caption" style={{ color: colors.navy, fontWeight: "700", marginLeft: 6 }}>
                {m.label}
              </AppText>
            </View>
          ))}
        </View>
      )}

      {programme.description ? (
        <Card padded style={{ marginTop: 16 }}>
          <AppText variant="h3">About this programme</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 8, lineHeight: 20 }}>
            {programme.description}
          </AppText>
        </Card>
      ) : null}

      {programme.price_min != null || programme.price_max != null ? (
        <Card padded style={{ marginTop: 12 }}>
          <AppText variant="h3">Fee</AppText>
          <AppText variant="h2" style={{ color: colors.success, marginTop: 6 }}>
            {programme.price_min != null ? formatNaira(programme.price_min) : ""}
            {programme.price_max != null && programme.price_max !== programme.price_min
              ? ` – ${formatNaira(programme.price_max)}`
              : ""}
          </AppText>
          <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
            {programme.currency} · escrow-protected
          </AppText>
        </Card>
      ) : null}

      {programme.subjects.length > 0 && (
        <Card padded style={{ marginTop: 12 }}>
          <AppText variant="h3">Subjects</AppText>
          <View style={styles.chips}>
            {programme.subjects.map((s) => (
              <View key={s} style={styles.chip}>
                <AppText variant="caption" style={{ color: colors.navy, fontWeight: "700" }}>{s}</AppText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {programme.next_start ? (
        <Card padded style={{ marginTop: 12, flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="calendar-outline" size={18} color={colors.navy} />
          <AppText variant="bodySm" style={{ color: colors.ink[700], marginLeft: 10, flex: 1 }}>
            Next start: {programme.next_start}
          </AppText>
        </Card>
      ) : null}

      <View style={{ marginTop: 20 }}>
        <Button label="Explore related subjects" variant="secondary" full onPress={() => router.replace("/subjects" as never)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, borderRadius: 20, padding: 24 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.goldLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { backgroundColor: colors.goldLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
