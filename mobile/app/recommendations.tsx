import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Recommendations — "NUVORA on the go" suggestions feed: cohorts, programmes
// and tutors ranked against the session's learner profile (server-side).

type RecCohort = { id: string; title: string; reason: string; enrolled_count: number; capacity: number };
type RecProgramme = { id: string; title: string; slug: string; reason: string };
type RecTutor = { profile: { id: string; slug: string; display_name: string; rating_avg: number }; subjects: string[] };
type Recs = { cohorts: RecCohort[]; programmes: RecProgramme[]; tutors: RecTutor[]; basis: string };

export default function Recommendations() {
  const [recs, setRecs] = useState<Recs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Recs>("/me/recommendations");
      setRecs(res.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load recommendations");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>For you</Text>
      {recs?.basis ? <Text style={styles.sub}>{recs.basis}</Text> : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.gold} size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          {recs && recs.cohorts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Cohorts starting soon</Text>
              {recs.cohorts.map((c) => (
                <View key={c.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <Text style={styles.cardDesc}>
                    {c.reason} · {c.enrolled_count}/{c.capacity} enrolled
                  </Text>
                </View>
              ))}
            </>
          )}

          {recs && recs.programmes.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Programmes for your level</Text>
              {recs.programmes.map((p) => (
                <View key={p.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{p.title}</Text>
                  <Text style={styles.cardDesc}>{p.reason}</Text>
                </View>
              ))}
            </>
          )}

          {recs && recs.tutors.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Top-rated tutors</Text>
              {recs.tutors.map((t) => (
                <View key={t.profile.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{t.profile.display_name}</Text>
                  <Text style={styles.cardDesc}>
                    ★ {t.profile.rating_avg.toFixed(1)} · {t.subjects.slice(0, 2).join(", ")}
                  </Text>
                </View>
              ))}
            </>
          )}

          {recs && recs.cohorts.length === 0 && recs.programmes.length === 0 && recs.tutors.length === 0 && (
            <Text style={styles.empty}>Add a learner to personalise your recommendations.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "800", color: colors.navy },
  sub: { fontSize: 13, color: colors.ink[500], marginTop: 4, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.navy, marginTop: 16, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E8E4DA", padding: 16, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.ink[900] },
  cardDesc: { fontSize: 13, color: colors.ink[500], marginTop: 4 },
  error: { color: colors.danger, marginTop: 24 },
  empty: { color: colors.ink[500], marginTop: 24, lineHeight: 20 },
});
