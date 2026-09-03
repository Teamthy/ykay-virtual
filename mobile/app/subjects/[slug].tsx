import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import { getSubject, type CatalogueSubject } from "@/src/lib/catalogue";

// Subject detail — read from the live /subjects/{slug} catalogue (same data as
// the web subject page).

export default function SubjectDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [subject, setSubject] = useState<CatalogueSubject | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setSubject(await getSubject(slug));
    } catch {
      setSubject(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useFocusEffect(useCallback(() => void load(), [load]));

  if (loading) {
    return (
      <Screen scroll>
        <AppText
          variant="bodySm"
          style={{ color: colors.ink[500], textAlign: "center", marginTop: 48 }}
        >
          Loading subject…
        </AppText>
      </Screen>
    );
  }

  if (!subject) {
    return (
      <Screen scroll>
        <AppText variant="h2" style={{ marginTop: 32 }}>
          Subject not found
        </AppText>
        <AppText
          variant="bodySm"
          style={{ color: colors.ink[500], marginTop: 8 }}
        >
          This subject may have been removed from the catalogue.
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <AppText variant="label" style={{ color: colors.goldDark }}>
          {subject.category.toUpperCase()}
        </AppText>
        <AppText variant="h1" style={{ color: colors.white, marginTop: 6 }}>
          {subject.name}
        </AppText>
      </View>

      <Card padded style={{ marginTop: 16 }}>
        <AppText variant="h3">About this subject</AppText>
        <AppText
          variant="bodySm"
          style={{ color: colors.ink[600], marginTop: 8, lineHeight: 20 }}
        >
          {subject.description?.trim()
            ? subject.description
            : "A catalogue subject taught by vetted YK-Virtual tutors. Find a specialist below."}
        </AppText>
      </Card>

      <View style={styles.cta}>
        <Button
          label="Find tutors for this subject"
          full
          onPress={() =>
            router.push(`/search?subject=${subject.slug}` as never)
          }
        />
        <View style={{ height: 10 }} />
        <Button
          label="Browse all subjects"
          variant="secondary"
          full
          onPress={() => router.replace("/subjects" as never)}
        />
      </View>

      <Card
        padded
        style={{ marginTop: 8, flexDirection: "row", alignItems: "center" }}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={18}
          color={colors.success}
        />
        <AppText
          variant="caption"
          style={{ color: colors.ink[500], marginLeft: 10, flex: 1 }}
        >
          Every tutor is vetted — identity, documents, interview and competency
          assessment.
        </AppText>
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    hero: {
      backgroundColor: colors.navy,
      borderRadius: 20,
      padding: 24,
    },
    cta: { marginTop: 20 },
  });
