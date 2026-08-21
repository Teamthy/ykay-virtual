import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Contact / support — creates a real support ticket (POST /support/tickets),
// mirroring the web contact page. Safeguarding concerns are routed to a senior
// reviewer.

const CATEGORIES = ["General enquiry", "Private tuition", "Cohort enrolment", "Payments & refunds", "Technical support", "Safeguarding concern"] as const;

export default function ContactScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = useCallback(async () => {
    if (!email.includes("@")) {
      return Alert.alert("Check your email", "Enter a valid email so we can reply.");
    }
    if (message.trim().length < 10) {
      return Alert.alert("Tell us more", "Please write at least 10 characters.");
    }
    setBusy(true);
    try {
      await apiFetch("/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          subject: subject.trim() || category,
          message: message.trim(),
          category: category === "Safeguarding concern" ? "SAFEGUARDING" : "GENERAL",
        }),
      });
      setSent(true);
    } catch (e) {
      Alert.alert("Could not send", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }, [email, category, subject, message]);

  if (sent) {
    return (
      <Screen scroll>
        <ScreenHeader eyebrow="Contact" title="Message sent" />
        <Card padded>
          <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          <AppText variant="h3" style={{ marginTop: 12 }}>We've got it</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}>
            Your ticket is in our queue. Our team typically responds within one business day.
            For safeguarding concerns, a senior team member reviews the ticket directly.
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="We're here to help"
        title="Contact & Support"
        subtitle="Send a message and our team will respond within one business day."
      />

      <Card padded>
        <AppText variant="label" style={{ marginBottom: 6 }}>CATEGORY</AppText>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Card key={c} onPress={() => setCategory(c)} padded style={category === c ? { ...styles.chip, backgroundColor: colors.gold } : styles.chip}>
              <AppText variant="caption" style={{ color: category === c ? colors.ink[900] : colors.ink[600], fontWeight: "700" }}>
                {c}
              </AppText>
            </Card>
          ))}
        </View>

        <AppInput
          label="Email *"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />
        <AppInput
          label="Subject"
          placeholder="Short summary"
          value={subject}
          onChangeText={setSubject}
          editable={!busy}
        />
        <AppInput
          label="Message *"
          placeholder="Tell us what you need help with…"
          multiline
          value={message}
          onChangeText={setMessage}
          editable={!busy}
          style={{ minHeight: 110, textAlignVertical: "top" }}
        />
        <View style={{ height: 8 }} />
        <Button label="Send message" loading={busy} full onPress={() => void submit()} />
      </Card>

      <AppText variant="caption" style={{ color: colors.ink[400], textAlign: "center", marginTop: 16 }}>
        Your message creates a trackable support ticket. For safeguarding concerns, a senior team
        member reviews the ticket directly.
      </AppText>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 10 },
});
