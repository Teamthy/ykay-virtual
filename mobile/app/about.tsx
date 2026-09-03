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

// About YK-Virtual — mirrors the factual content of the web /about page.

const PILLARS = [
  {
    icon: "school-outline",
    title: "Academically governed",
    body: "YK-Virtual controls tutor quality, programme standards and the learner experience. Every tutor is vetted, every programme follows a defined curriculum pathway.",
  },
  {
    icon: "book-outline",
    title: "Multi-curriculum",
    body: "British and Nigerian pathways in one platform — from Year 7 and JSS1 through IGCSE, WAEC, NECO, JAMB and A-Level.",
  },
  {
    icon: "eye-outline",
    title: "Parent visibility",
    body: "Attendance, progress, tutor feedback, schedules and payments — visible in one parent dashboard.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Safeguarding by design",
    body: "Because the platform serves children, safeguarding is a product requirement: restricted messaging, governed lesson access and careful handling of learner data.",
  },
] as const;

const QUALITY = [
  "Staged tutor vetting: identity, documents, interview and competency assessment",
  "Curriculum-governed programmes with defined learning outcomes",
  "Lesson notes, attendance and homework after every session",
  "Weekly progress reports with strengths, weaknesses and recommendations",
] as const;

export default function AboutScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Who we are"
        title="A school without walls"
        subtitle="YK-Virtual is a digital education business — an online school rather than a simple tutor directory."
      />

      <View style={styles.vision}>
        <AppText
          style={{ fontSize: 22, fontWeight: "800", color: colors.ink[900] }}
        >
          Our vision
        </AppText>
        <AppText
          variant="bodySm"
          style={{ color: "rgba(0,0,0,0.75)", marginTop: 8, lineHeight: 20 }}
        >
          To make high-quality, accountable teaching accessible beyond geography
          — giving every learner access to structured, high-quality education
          wherever they are.
        </AppText>
      </View>

      <AppText variant="label" style={styles.sectionTitle}>
        WHY YK-Virtual
      </AppText>
      {PILLARS.map((p) => (
        <Card key={p.title} padded style={styles.card}>
          <Ionicons
            name={p.icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={colors.navy}
          />
          <AppText variant="h3" style={{ marginTop: 8 }}>
            {p.title}
          </AppText>
          <AppText
            variant="bodySm"
            style={{ color: colors.ink[600], marginTop: 4, lineHeight: 19 }}
          >
            {p.body}
          </AppText>
        </Card>
      ))}

      <AppText variant="label" style={styles.sectionTitle}>
        ACADEMIC QUALITY
      </AppText>
      <Card padded>
        {QUALITY.map((q) => (
          <View key={q} style={styles.qualityRow}>
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
              {q}
            </AppText>
          </View>
        ))}
      </Card>

      <View style={{ marginTop: 20 }}>
        <Button
          label="Explore on the web"
          variant="secondary"
          full
          onPress={() =>
            void Linking.openURL("https://virtual.ykaycollege.com/about")
          }
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    vision: { backgroundColor: colors.gold, borderRadius: 20, padding: 24 },
    sectionTitle: {
      color: colors.goldDark,
      letterSpacing: 1.1,
      fontSize: 12,
      marginTop: 24,
      marginBottom: 10,
    },
    card: { marginBottom: 10 },
    qualityRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 10,
    },
  });
