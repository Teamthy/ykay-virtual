import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { listSubjects, type CatalogueSubject } from "@/src/lib/catalogue";

// Subjects — the full teaching catalogue (British/Nigerian academic subjects,
// languages, digital skills, exam prep), searchable and filterable by category.

export default function SubjectsScreen() {
  const [subjects, setSubjects] = useState<CatalogueSubject[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const s = await listSubjects();
      setSubjects(s.filter((x) => x.is_active));
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const categories = useMemo(() => {
    const set = new Set(subjects.map((s) => s.category).filter(Boolean));
    return Array.from(set).sort();
  }, [subjects]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter((s) => {
      const matchesCat = !category || s.category === category;
      const matchesQ = !q || s.name.toLowerCase().includes(q) || s.slug.includes(q);
      return matchesCat && matchesQ;
    });
  }, [subjects, query, category]);

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Catalogue"
        title="Subjects"
        subtitle="Everything we teach — British and Nigerian curricula, languages and digital skills."
      />

      <AppInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search subjects, e.g. Mathematics…"
        style={{ marginBottom: 12 }}
      />

      <View style={styles.categories}>
        <Card
          onPress={() => setCategory(null)}
          padded
          style={category === null ? { ...styles.catChip, backgroundColor: colors.gold } : styles.catChip}
        >
          <AppText variant="caption" style={{ color: category === null ? colors.ink[900] : colors.ink[600], fontWeight: "700" }}>
            All
          </AppText>
        </Card>
        {categories.map((c) => {
          const active = category === c;
          return (
            <Card key={c} onPress={() => setCategory(active ? null : c)} padded style={active ? { ...styles.catChip, backgroundColor: colors.gold } : styles.catChip}>
              <AppText variant="caption" style={{ color: active ? colors.ink[900] : colors.ink[600], fontWeight: "700" }}>
                {c}
              </AppText>
            </Card>
          );
        })}
      </View>

      {loading ? (
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 24 }}>
          Loading subjects…
        </AppText>
      ) : visible.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No subjects match your search.
          </AppText>
        </Card>
      ) : (
        visible.map((s) => (
          <Card key={s.id} onPress={() => router.push(`/subjects/${s.slug}` as never)} padded style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{s.name}</AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                {s.category}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.goldDark} />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  catChip: { paddingVertical: 8, paddingHorizontal: 12 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
});
