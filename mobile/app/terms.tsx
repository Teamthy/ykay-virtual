import { useMemo } from "react";
import { Linking } from "react-native";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";

// Terms of Service — the section headings and key points. The full text lives
// on the web (virtual.ykaycollege.com/terms).

const SECTIONS = [
  {
    h: "The service",
    p: "YK-Virtual provides vetted tutoring, cohort programmes, exam preparation and progress reporting.",
  },
  {
    h: "Accounts",
    p: "Keep your login secure. One person per account; contact us if your account is compromised.",
  },
  {
    h: "Payments & escrow",
    p: "Fees are held in escrow and released to tutors only after lessons are delivered. Pay through the platform — never off-platform.",
  },
  {
    h: "Acceptable use",
    p: "No abuse, harassment, or sharing of learner data outside the platform's safeguards.",
  },
  {
    h: "Termination",
    p: "We may suspend or close accounts that breach these terms or endanger learners.",
  },
  {
    h: "Contact & law",
    p: "Questions go to support@ykaycollege.com. The service is provided by YK-Virtual.",
  },
] as const;

export default function TermsScreen() {
  const { colors } = useTheme();
  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Legal"
        title="Terms of Service"
        subtitle="Last updated: August 2026"
      />

      {SECTIONS.map((s) => (
        <Card key={s.h} padded style={{ marginBottom: 10 }}>
          <AppText variant="h3">{s.h}</AppText>
          <AppText
            variant="bodySm"
            style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}
          >
            {s.p}
          </AppText>
        </Card>
      ))}

      <Button
        label="Read the full terms"
        variant="secondary"
        full
        onPress={() =>
          void Linking.openURL("https://virtual.ykaycollege.com/terms")
        }
      />
    </Screen>
  );
}
