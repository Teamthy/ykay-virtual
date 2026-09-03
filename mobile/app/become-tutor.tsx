import { useMemo } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";

// Become a tutor — the staged vetting journey. The full application flow
// (profile, subjects, documents, assessment) runs on the web; here we explain
// the process and link into it.

const STEPS = [
  {
    icon: "person-outline",
    title: "Create your profile",
    body: "Your name, headline, bio and the subjects you want to teach.",
  },
  {
    icon: "document-attach-outline",
    title: "Upload documents",
    body: "A government-issued ID. Documents live in a private bucket with signed URLs.",
  },
  {
    icon: "create-outline",
    title: "Pass the assessment",
    body: "A short quiz on each subject you applied to teach — 70% to pass, valid for 12 months.",
  },
  {
    icon: "chatbubbles-outline",
    title: "Interview & checks",
    body: "An interview and background checks before approval. Review within 5–7 working days.",
  },
] as const;

const PERKS = [
  "Set your own rates",
  "Learner payments held in escrow until lessons are delivered",
  "Weekly payouts from released escrow",
  "Public profile with an honest verified badge",
] as const;

export default function BecomeTutorScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Teach with YK-Virtual"
        title="Become a tutor"
        subtitle="Join a vetted team and earn from structured, high-quality teaching."
      />

      <View style={styles.hero}>
        <Ionicons name="school-outline" size={30} color={colors.ink[900]} />
        <AppText variant="h3" style={{ marginTop: 10 }}>
          Teach your subject, your way
        </AppText>
        <AppText
          variant="bodySm"
          style={{ color: "rgba(0,0,0,0.75)", marginTop: 6, lineHeight: 19 }}
        >
          YK-Virtual controls quality: every tutor is vetted, every lesson is
          curriculum-governed, and your earnings are protected by escrow.
        </AppText>
      </View>

      <AppText variant="label" style={styles.sectionTitle}>
        HOW IT WORKS
      </AppText>
      {STEPS.map((s, i) => (
        <Card key={s.title} padded style={styles.step}>
          <View style={styles.stepIcon}>
            <Ionicons
              name={s.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={colors.navy}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="h3">
              {i + 1}. {s.title}
            </AppText>
            <AppText
              variant="bodySm"
              style={{ color: colors.ink[600], marginTop: 4, lineHeight: 19 }}
            >
              {s.body}
            </AppText>
          </View>
        </Card>
      ))}

      <AppText variant="label" style={styles.sectionTitle}>
        WHY TEACH HERE
      </AppText>
      <Card padded>
        {PERKS.map((p) => (
          <View key={p} style={styles.perkRow}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.success}
            />
            <AppText
              variant="bodySm"
              style={{
                color: colors.ink[700],
                marginLeft: 8,
                flex: 1,
                lineHeight: 19,
              }}
            >
              {p}
            </AppText>
          </View>
        ))}
      </Card>

      <View style={{ marginTop: 20 }}>
        <Button
          label="Start your application"
          full
          onPress={() =>
            void Linking.openURL("https://virtual.ykaycollege.com/become-tutor")
          }
        />
        <View style={{ height: 10 }} />
        <Button
          label="Read the tutor FAQs"
          variant="secondary"
          full
          onPress={() =>
            void Linking.openURL("https://virtual.ykaycollege.com/help")
          }
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    hero: { backgroundColor: colors.gold, borderRadius: 20, padding: 24 },
    sectionTitle: {
      color: colors.goldDark,
      letterSpacing: 1.1,
      fontSize: 12,
      marginTop: 24,
      marginBottom: 10,
    },
    step: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
    stepIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.goldLight,
      alignItems: "center",
      justifyContent: "center",
    },
    perkRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 10,
    },
  });
