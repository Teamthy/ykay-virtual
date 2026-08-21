import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { Card } from "@/src/components/ui/Card";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { TabLayout } from "@/src/components/TabLayout";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing } from "@/src/lib/theme";
import {
  formatRating,
  listSubjects,
  searchTutors,
  type CatalogueSubject,
  type TutorCard,
} from "@/src/lib/catalogue";
import { isSaved, toggleSaved, type SavedTutor } from "@/src/lib/wishlist";

// Explore / Discovery — header → search → categories → featured → recommended
// → popular. Horizontal-scrolling sections are used sparingly; cards
// communicate the most important info (name, subject, rating) immediately.

const FEATURED_QUERIES = ["Mathematics", "Computer Science", "Python"] as const;

export default function ExploreScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ q?: string; subject?: string }>();
  const subjectSlug = typeof params.subject === "string" ? params.subject : undefined;
  const [query, setQuery] = useState(typeof params.q === "string" ? params.q : "");
  const [results, setResults] = useState<TutorCard[]>([]);
  const [categories, setCategories] = useState<CatalogueSubject[]>([]);
  const [featured, setFeatured] = useState<TutorCard[]>([]);
  const [recommended, setRecommended] = useState<TutorCard[]>([]);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDiscovery, setLoadingDiscovery] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDiscovery = useCallback(async () => {
    setLoadingDiscovery(true);
    try {
      const subs = await listSubjects();
      setCategories(subs.filter((s) => s.is_active).slice(0, 12));
      const [feat, rec] = await Promise.all([
        searchTutors({ q: FEATURED_QUERIES[0], page_size: 6 }),
        searchTutors({ page_size: 10 }),
      ]);
      setFeatured(feat);
      setRecommended(rec);
    } catch {
      // catalogue is offline-cached; screens degrade gracefully
    } finally {
      setLoadingDiscovery(false);
    }
  }, []);

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

  useFocusEffect(
    useCallback(() => {
      void loadDiscovery();
      void runSearch(query);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadDiscovery, runSearch])
  );

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

  const active = query.trim().length >= 2 || !!subjectSlug;

  return (
    <TabLayout>
      <Screen scroll>
        <View style={styles.header}>
          <AppText variant="h1">Explore</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 2 }}>
            Find the right tutor, subject or programme.
          </AppText>
        </View>

        <AppInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            void runSearch(t);
          }}
          placeholder="Try “Mathematics”, “Biology”, “Python”…"
          style={{ marginBottom: spacing.sm }}
          returnKeyType="search"
        />

        {active ? (
          // ── Search results ──────────────────────────────────────────────
          loading ? (
            <View style={{ marginTop: spacing.sm }}>
              <Skeleton height={72} radius={radius.lg} />
              <Skeleton height={72} radius={radius.lg} style={{ marginTop: spacing.sm }} />
              <Skeleton height={72} radius={radius.lg} style={{ marginTop: spacing.sm }} />
            </View>
          ) : searched && results.length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="No tutors found"
              description="No tutors match that search yet. Try a broader term or a different subject."
            />
          ) : (
            results.map((t) => {
              const saved = savedSet.has(t.slug);
              return (
                <Card key={t.id} style={styles.tutorRow}>
                  <View style={[styles.avatar, { backgroundColor: colors.greenLight }]}>
                    <AppText style={{ fontWeight: "800", color: colors.navy }}>{t.display_name.slice(0, 1)}</AppText>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <AppText variant="h3" onPress={() => router.push(`/tutors/${t.slug}` as never)}>
                      {t.display_name}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }} numberOfLines={1}>
                      {t.subjects.map((s) => s.name).join(", ") || "General"}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.greenDark, marginTop: 2, fontWeight: "700" }}>
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
          )
        ) : loadingDiscovery ? (
          // ── Discovery loading ───────────────────────────────────────────
          <View style={{ marginTop: spacing.xl }}>
            <Skeleton width="30%" height={16} />
            <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width={90} height={36} radius={radius.pill} />
              ))}
            </View>
            <Skeleton width="30%" height={16} style={{ marginTop: spacing.xl }} />
            <Skeleton height={120} radius={radius.lg} style={{ marginTop: spacing.sm }} />
            <Skeleton height={120} radius={radius.lg} style={{ marginTop: spacing.sm }} />
          </View>
        ) : (
          // ── Discovery content ───────────────────────────────────────────
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.section}>
            <AppText variant="label" style={[styles.sectionTitle, { color: colors.ink[500] }]}>
              CATEGORIES
            </AppText>
            <View style={styles.chips}>
              {categories.map((s) => (
                <View
                  key={s.slug}
                  style={styles.chip}
                  onTouchEnd={() => router.push(`/search?subject=${s.slug}` as never)}
                >
                  <AppText variant="bodySm" style={{ color: colors.greenDark, fontWeight: "700" }}>
                    {s.name}
                  </AppText>
                </View>
              ))}
              {categories.length === 0 && (
                <AppText variant="bodySm" style={{ color: colors.ink[400] }}>Subjects loading…</AppText>
              )}
            </View>
          </ScrollView>
        )}

        {/* Featured — shown regardless of search for discovery richness */}
        {!active && featured.length > 0 && (
          <View style={styles.section}>
            <AppText variant="label" style={[styles.sectionTitle, { color: colors.ink[500] }]}>
              FEATURED
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }}>
              <View style={styles.hScroll}>
                {featured.map((t) => (
                  <Card key={t.id} style={styles.featuredCard} onPress={() => router.push(`/tutors/${t.slug}` as never)}>
                    <View style={[styles.fAvatar, { backgroundColor: colors.green }]}>
                      <AppText style={{ fontWeight: "800", color: colors.white }}>{t.display_name.slice(0, 1)}</AppText>
                    </View>
                    <AppText variant="heading" style={{ marginTop: spacing.sm }}>
                      {t.display_name}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }} numberOfLines={1}>
                      {t.subjects.map((s) => s.name).join(", ") || "General"}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.greenDark, marginTop: 4, fontWeight: "700" }}>
                      {formatRating(t.rating_avg, t.rating_count)}
                    </AppText>
                  </Card>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Recommended */}
        {!active && recommended.length > 0 && (
          <View style={styles.section}>
            <AppText variant="label" style={[styles.sectionTitle, { color: colors.ink[500] }]}>
              RECOMMENDED FOR YOU
            </AppText>
            {recommended.slice(0, 5).map((t) => {
              const saved = savedSet.has(t.slug);
              return (
                <Card key={t.id} style={styles.tutorRow}>
                  <View style={[styles.avatar, { backgroundColor: colors.greenLight }]}>
                    <AppText style={{ fontWeight: "800", color: colors.navy }}>{t.display_name.slice(0, 1)}</AppText>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <AppText variant="h3" onPress={() => router.push(`/tutors/${t.slug}` as never)}>
                      {t.display_name}
                    </AppText>
                    <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }} numberOfLines={1}>
                      {t.subjects.map((s) => s.name).join(", ") || "General"}
                    </AppText>
                  </View>
                  <AppText variant="caption" style={{ color: colors.greenDark, fontWeight: "700" }}>
                    {formatRating(t.rating_avg, t.rating_count)}
                  </AppText>
                  <Ionicons
                    name={saved ? "heart" : "heart-outline"}
                    size={18}
                    color={saved ? colors.danger : colors.ink[300]}
                    onPress={() => void toggle(t)}
                    style={{ marginLeft: spacing.sm }}
                  />
                </Card>
              );
            })}
          </View>
        )}
      </Screen>
    </TabLayout>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.lg },
  section: { marginTop: spacing.xl, marginBottom: spacing.xs },
  sectionTitle: { letterSpacing: 1.1, marginBottom: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  hScroll: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg },
  featuredCard: { width: 200, padding: spacing.md },
  fAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorRow: {
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
