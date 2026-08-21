import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import { getTutorReviews, type TutorReview } from "@/src/lib/catalogue";

// Tutor reviews — the published, consent-gated reviews for a tutor
// (GET /tutors/{slug}/reviews). Reviewers are anonymous by design.

function StarRow({ rating }: { rating: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= rating ? "star" : "star-outline"} size={15} color={n <= rating ? "#F4B400" : colors.ink[300]} />
      ))}
    </View>
  );
}

export default function TutorReviewsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [reviews, setReviews] = useState<TutorReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setReviews(await getTutorReviews(slug));
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Reviews"
        title="What learners say"
        subtitle="Published reviews from families who gave their consent to share."
      />

      {loading ? (
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 24 }}>
          Loading reviews…
        </AppText>
      ) : reviews.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No published reviews yet. Reviews appear after families book lessons and give consent to share.
          </AppText>
        </Card>
      ) : (
        reviews.map((r) => (
          <Card key={r.id} padded style={styles.card}>
            <View style={styles.topRow}>
              <StarRow rating={r.rating} />
              <AppText variant="caption" style={{ color: colors.ink[400] }}>
                {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              </AppText>
            </View>
            {r.title ? <AppText variant="h3" style={{ marginTop: 8 }}>{r.title}</AppText> : null}
            {r.comment ? (
              <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 20 }}>
                {r.comment}
              </AppText>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: { marginBottom: 10 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stars: { flexDirection: "row", gap: 2 },
});
