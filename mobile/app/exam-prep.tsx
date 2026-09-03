import { useMemo } from "react";
import { router } from "expo-router";
import { Linking, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import { EXAMS, getSubject } from "@/src/lib/exam-prep-data";

// Exam preparation — the major exams YK-Virtual prepares learners for, with
// factual paper descriptions and native subject guides (mirrors the web
// /exam-prep hub, drawing from the same lib/exam-prep-data.ts).

export default function ExamPrepScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Exam season, handled"
        title="Exam preparation"
        subtitle="Revision cohorts, past-paper practice and mocks for WAEC, NECO, JAMB, IGCSE and A-Level."
      />

      {EXAMS.map((e) => {
        const subjects = e.subjects
          .map((slug) => getSubject(slug))
          .filter(Boolean);
        return (
          <Card key={e.code} padded style={styles.card}>
            <View style={styles.cardTop}>
              <AppText variant="h1" style={{ color: colors.navy }}>
                {e.code}
              </AppText>
              <View style={styles.levelPill}>
                <AppText
                  variant="caption"
                  style={{ color: colors.navy, fontWeight: "700" }}
                  numberOfLines={2}
                >
                  {e.level}
                </AppText>
              </View>
            </View>
            <AppText variant="h3" style={{ marginTop: 4 }}>
              {e.name}
            </AppText>
            <AppText
              variant="bodySm"
              style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}
            >
              {e.structure[0]}
            </AppText>

            <AppText variant="label" style={styles.subjectsLabel}>
              SUBJECT GUIDES
            </AppText>
            <View style={styles.chips}>
              {subjects.map((s) => (
                <Card
                  key={s!.slug}
                  onPress={() =>
                    router.push(`/exam-prep/${e.slug}/${s!.slug}` as never)
                  }
                  padded
                  style={styles.chip}
                >
                  <AppText
                    variant="caption"
                    style={{ color: colors.navy, fontWeight: "700" }}
                  >
                    {s!.name}
                  </AppText>
                </Card>
              ))}
            </View>
          </Card>
        );
      })}

      <View style={styles.cta}>
        <Button
          label="Browse the subject catalogue"
          full
          onPress={() => router.push("/subjects" as never)}
        />
        <View style={{ height: 10 }} />
        <Button
          label="Explore programmes on the web"
          variant="secondary"
          full
          onPress={() =>
            void Linking.openURL("https://virtual.ykaycollege.com/programmes")
          }
        />
      </View>

      <Card
        padded
        style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={colors.navy}
        />
        <AppText
          variant="caption"
          style={{ color: colors.ink[500], marginLeft: 10, flex: 1 }}
        >
          Paper structure and grading reflect each exam's published format;
          always confirm with the official board.
        </AppText>
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: { marginBottom: 12 },
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    levelPill: {
      backgroundColor: colors.goldLight,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      maxWidth: "55%",
    },
    subjectsLabel: {
      color: colors.goldDark,
      letterSpacing: 1,
      fontSize: 11,
      marginTop: 14,
      marginBottom: 8,
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingVertical: 8, paddingHorizontal: 12 },
    cta: { marginTop: 8 },
  });
