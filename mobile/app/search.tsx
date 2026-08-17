import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { formatRating, searchTutors, type TutorCard } from "@/src/lib/catalogue";
import { isSaved, toggleSaved, type SavedTutor } from "@/src/lib/wishlist";

// Search — free-text and subject-filtered tutor search over the live catalogue
// (GET /tutors/search), with a save/heart toggle wired to the device wishlist.

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; subject?: string }>();
  const subjectSlug = typeof params.subject === "string" ? params.subject : undefined;
  const [query, setQuery] = useState(typeof params.q === "string" ? params.q : "");
  const [results, setResults] = useState<TutorCard[]>([]);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (q: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const term = q.trim();
        if (term.length < 2 && !subjectSlug) {
          setResults([]);
          setSearched(false);
          return;
        }
        setLoading(true);
        try {
          const r = await searchTutors({ q: term || undefined, subject: subjectSlug });
          setResults(r);
          const saved = new Set<string>();
          for (const t of r) {
            if (await isSaved(t.slug)) saved.add(t.slug);
          }
          setSavedSet(saved);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
          setSearched(true);
        }
      }, 350);
    },
    [subjectSlug]
  );

  // Run once on focus (subject-filtered deep links), then on each keystroke.
  useFocusEffect(
    useCallback(() => {
      void runSearch(query);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runSearch])
  );

  useEffect(() => {
    if (subjectSlug) void runSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectSlug]);

  const toggle = async (t: TutorCard) => {
    const card: SavedTutor = {
      slug: t.slug,
      name: t.display_name,
      subjects: t.subjects.map((s) => s.name),
      rating: t.rating_avg,
    };
    const next = await toggleSaved(card);
    setSavedSet(new Set(next.map((x) => x.slug)));
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Discover"
        title={subjectSlug ? "Tutors for this subject" : "Find a tutor"}
        subtitle="Search vetted tutors by name, subject or keyword."
      />

      <AppInput
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          void runSearch(t);
        }}
        placeholder="Try “Mathematics”, “IELTS”, “Python”…"
        style={{ marginBottom: 12 }}
        returnKeyType="search"
      />

      {loading ? (
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 24 }}>
          Searching…
        </AppText>
      ) : searched && results.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No tutors match that search yet. Try a broader term.
          </AppText>
        </Card>
      ) : (
        results.map((t) => {
          const saved = savedSet.has(t.slug);
          return (
            <Card key={t.id} padded style={styles.row}>
              <View style={styles.avatar}>
                <AppText style={{ fontWeight: "800", color: colors.navy }}>{t.display_name.slice(0, 1)}</AppText>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="h3" onPress={() => router.push(`/tutors/${t.slug}` as never)}>
                  {t.display_name}
                </AppText>
                <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }} numberOfLines={1}>
                  {t.subjects.map((s) => s.name).join(", ") || "General"}
                </AppText>
                <AppText variant="caption" style={{ color: colors.goldDark, marginTop: 2, fontWeight: "700" }}>
                  {formatRating(t.rating_avg, t.rating_count)}
                </AppText>
              </View>
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={20}
                color={saved ? colors.danger : colors.ink[300]}
                onPress={() => void toggle(t)}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
