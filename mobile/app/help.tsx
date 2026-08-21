import { useMemo } from "react";
import { Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";

// Help — the most common questions, plus paths to the full web Help Center and
// the contact/support team. Answers are the same factual FAQs as the web.

const FAQS = [
  { q: "How is my payment protected?", a: "Your fee is held in escrow and released to the tutor only after lessons are delivered — either when you confirm or automatically after the delivery window." },
  { q: "How do I add a learner?", a: "From Account → Learners, tap Add a learner. A minor (under 17) must be linked to a parent or guardian to enrol." },
  { q: "How do I join a live lesson?", a: "Open My Learning, choose your course and open the lesson. The meeting link is available inside the join window before the session." },
  { q: "How does vetting work?", a: "Staged: identity + documents, competency assessment, interview and background checks before approval." },
  { q: "How do I report a concern?", a: "Contact support immediately. Safeguarding concerns are reviewed directly by a senior team member." },
] as const;

export default function HelpScreen() {
  const { colors } = useTheme();
  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Help Center"
        title="How can we help?"
        subtitle="The most common questions, answered."
      />

      {FAQS.map((f) => (
        <Card key={f.q} padded style={{ marginBottom: 10 }}>
          <AppText variant="h3">{f.q}</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}>{f.a}</AppText>
        </Card>
      ))}

      <Card padded style={{ backgroundColor: colors.navy, marginTop: 6 }}>
        <Ionicons name="help-buoy-outline" size={26} color={colors.deep} />
        <AppText variant="h2" style={{ color: colors.white, marginTop: 8 }}>Still need help?</AppText>
        <AppText variant="bodySm" style={{ color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
          Our support team usually replies within one working day.
        </AppText>
        <Button
          label="Contact support"
          full
          onPress={() => void Linking.openURL("https://nuvora.com/contact")}
        />
      </Card>

      <Button
        label="Open the full Help Center"
        variant="secondary"
        full
        onPress={() => void Linking.openURL("https://nuvora.com/help")}
      />
    </Screen>
  );
}
