import { useMemo } from "react";
import { Linking } from "react-native";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";

// Privacy — the section headings and key points of our Privacy Policy. The full
// text lives on the web (nuvora.com/privacy).

const SECTIONS = [
  { h: "What we collect", p: "Account details (name, email, phone), learner profiles you create, and the activity needed to run lessons and payments." },
  { h: "How we use your data", p: "To deliver lessons, run escrow payments, show progress, and keep the platform safe. We don't sell your data." },
  { h: "Children's data", p: "Minors are created and linked by parents or guardians. Learner contact details are never exposed to tutors unless business rules require it." },
  { h: "AI assistant", p: "The chat assistant processes your messages to answer questions; conversations stay account-scoped." },
  { h: "Security", p: "Sessions use secure cookies/tokens, passwords are hashed, and access to tutor documents is governed by signed URLs." },
  { h: "Your rights", p: "You can export everything we hold on your account and delete it at any time (Account → Data on the web app)." },
] as const;

export default function PrivacyScreen() {
  const { colors } = useTheme();
  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="Last updated: August 2026"
      />

      {SECTIONS.map((s) => (
        <Card key={s.h} padded style={{ marginBottom: 10 }}>
          <AppText variant="h3">{s.h}</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}>{s.p}</AppText>
        </Card>
      ))}

      <Button label="Read the full policy" variant="secondary" full onPress={() => void Linking.openURL("https://nuvora.com/privacy")} />
    </Screen>
  );
}
