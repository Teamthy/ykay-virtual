import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { formatNaira, formatRating, getTutor, type TutorCard } from "@/src/lib/catalogue";
import { isSaved, toggleSaved, type SavedTutor } from "@/src/lib/wishlist";

// Tutor detail — the public tutor profile (GET /tutors/{slug}) with an honest
// verified badge and a save-to-wishlist heart.

export default function TutorDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [tutor, setTutor] = useState<TutorCard | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const t = await getTutor(slug);
      setTutor(t);
      if (t) setSaved(await isSaved(t.slug));
    } catch {
      setTutor(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useFocusEffect(useCallback(() => void load(), [load]));

  if (loading) {
    return (
      <Screen scroll>
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 48 }}>
          Loading tutor…
        </AppText>
      </Screen>
    );
  }

  if (!tutor) {
    return (
      <Screen scroll>
        <AppText variant="h2" style={{ marginTop: 32 }}>Tutor not found</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 8 }}>
          This tutor may no longer be listed.
        </AppText>
      </Screen>
    );
  }

  const toggle = async () => {
    const card: SavedTutor = {
      slug: tutor.slug,
      name: tutor.display_name,
      subjects: tutor.subjects.map((s) => s.name),
      rating: tutor.rating_avg,
    };
    const next = await toggleSaved(card);
    setSaved(next.some((x) => x.slug === tutor.slug));
  };

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <AppText style={{ fontWeight: "800", color: colors.navy, fontSize: 26 }}>
            {tutor.display_name.slice(0, 1)}
          </AppText>
        </View>
        <AppText variant="h1" style={{ color: colors.white, marginTop: 12 }}>{tutor.display_name}</AppText>
        {tutor.headline ? (
          <AppText variant="bodySm" style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{tutor.headline}</AppText>
        ) : null}
        <View style={styles.heroRow}>
          <AppText variant="caption" style={{ color: colors.gold, fontWeight: "800" }}>
            {formatRating(tutor.rating_avg, tutor.rating_count)}
          </AppText>
          {tutor.verified_at ? (
            <View style={styles.verifiedPill}>
              <Ionicons name="shield-checkmark" size={12} color={colors.success} />
              <AppText variant="caption" style={{ color: colors.success, fontWeight: "800", marginLeft: 4 }}>
                ID VERIFIED
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label={saved ? "Saved" : "Save tutor"}
          variant={saved ? "secondary" : "primary"}
          full
          icon={<Ionicons name={saved ? "heart" : "heart-outline"} size={18} color={saved ? colors.navy : colors.ink[900]} />}
          onPress={() => void toggle()}
        />
      </View>

      <Card padded style={{ marginTop: 16 }}>
        <AppText variant="h3">About</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 8, lineHeight: 20 }}>
          {tutor.bio?.trim() || "This tutor hasn't written a bio yet."}
        </AppText>
      </Card>

      <View style={styles.statRow}>
        <Card padded style={styles.statCard}>
          <AppText variant="h3" style={{ color: colors.navy }}>
            {tutor.years_experience > 0 ? `${tutor.years_experience}y` : "—"}
          </AppText>
          <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>EXPERIENCE</AppText>
        </Card>
        <Card padded style={styles.statCard}>
          <AppText variant="h3" style={{ color: colors.navy }}>
            {tutor.total_hours_taught}h
          </AppText>
          <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>HOURS TAUGHT</AppText>
        </Card>
        <Card padded style={styles.statCard}>
          <AppText variant="h3" style={{ color: colors.navy }}>
            {tutor.total_students}
          </AppText>
          <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>STUDENTS</AppText>
        </Card>
      </View>

      <Card padded style={{ marginTop: 12 }}>
        <AppText variant="h3">Subjects</AppText>
        <View style={styles.chips}>
          {tutor.subjects.map((s) => (
            <View key={s.slug} style={styles.chip}>
              <AppText variant="caption" style={{ color: colors.navy, fontWeight: "700" }}>{s.name}</AppText>
            </View>
          ))}
        </View>
      </Card>

      {tutor.hourly_rate_min != null ? (
        <Card padded style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AppText variant="h3">Rate</AppText>
          <AppText variant="h3" style={{ color: colors.success }}>
            {formatNaira(tutor.hourly_rate_min)}
            {tutor.hourly_rate_max != null ? ` – ${formatNaira(tutor.hourly_rate_max)}` : ""} /hr
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, borderRadius: 20, padding: 24, alignItems: "center" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22,163,74,0.15)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actions: { marginTop: 16 },
  statRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  statCard: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: { backgroundColor: colors.goldLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
