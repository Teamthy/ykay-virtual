import { router, useLocalSearchParams } from "expo-router";
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
import { confirmVerification, resendVerification } from "@/src/lib/account";

// Verify email — confirm the verification token, or request a new one.

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(typeof params.token === "string" ? params.token : "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  const verify = async () => {
    if (token.trim().length < 8) {
      return Alert.alert("Check the token", "Paste the code from your verification email.");
    }
    setBusy(true);
    try {
      await confirmVerification(token.trim());
      Alert.alert("Email verified", "Your account is confirmed. You can now log in.", [
        { text: "Log in", onPress: () => router.replace("/login" as never) },
      ]);
    } catch (e) {
      Alert.alert("Could not verify", e instanceof Error ? e.message : "Please try again or request a new code.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!email.includes("@")) {
      return Alert.alert("Check your email", "Enter the email you signed up with.");
    }
    setBusy(true);
    try {
      await resendVerification(email.trim());
      setResent(true);
    } catch (e) {
      Alert.alert("Could not send", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Account verification"
        title="Verify your email"
        subtitle="Confirm the 6-digit code we emailed you to activate your account."
      />

      <Card padded>
        <AppInput
          label="Verification code"
          placeholder="Enter the code from your email"
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
          editable={!busy}
          onSubmitEditing={() => void verify()}
        />
        <View style={{ height: 8 }} />
        <Button label="Verify email" loading={busy} full onPress={() => void verify()} />
      </Card>

      <Card padded style={{ marginTop: 14 }}>
        <AppText variant="h3">Didn't get a code?</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}>
          Codes are single-use and expire after 10 minutes. Check your spam folder, then request a new one.
        </AppText>
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
        <Button label={resent ? "Sent — check your inbox" : "Resend code"} variant="secondary" loading={busy} full onPress={() => void resend()} />
      </Card>

      <AppText variant="caption" style={{ color: colors.ink[400], textAlign: "center", marginTop: 16 }}>
        Verification keeps accounts honest and protects learner data.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({});
