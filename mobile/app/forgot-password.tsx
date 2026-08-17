import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { requestPasswordReset } from "@/src/lib/account";

// Forgot password — request a reset email. The API always returns success to
// avoid revealing whether an account exists.

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.includes("@")) {
      return Alert.alert("Check your email", "Enter the email you signed up with.");
    }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      Alert.alert("Could not send", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Account recovery"
        title="Forgot password?"
        subtitle="Enter your email and we'll send a link to reset your password."
      />

      {sent ? (
        <Card padded>
          <Ionicons name="mail-outline" size={28} color={colors.success} />
          <AppText variant="h3" style={{ marginTop: 12 }}>Check your inbox</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}>
            If an account exists for {email}, you'll receive a reset link shortly. The link expires — use it promptly.
          </AppText>
          <View style={{ height: 16 }} />
          <Button label="Back to log in" full onPress={() => router.replace("/login" as never)} />
        </Card>
      ) : (
        <Card padded>
          <AppInput
            label="Email address"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
          />
          <View style={{ height: 8 }} />
          <Button label="Send reset link" loading={busy} full onPress={() => void submit()} />
          <View style={{ height: 12 }} />
          <Button label="Back to log in" variant="ghost" full onPress={() => router.replace("/login" as never)} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({});
