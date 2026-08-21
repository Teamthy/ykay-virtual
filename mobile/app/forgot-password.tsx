import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { BrandLogo } from "@/src/components/BrandLogo";
import { SuccessState } from "@/src/components/ui/SuccessState";
import { requestPasswordReset } from "@/src/lib/account";

// Forgot password — request a reset email. The API always returns success to
// avoid revealing whether an account exists. Branded, dark-mode aware.

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
        <SuccessState
          title="Check your inbox"
          message={`If an account exists for ${email}, you'll receive a reset link shortly. The link expires — use it promptly.`}
          actionLabel="Back to log in"
          onAction={() => router.replace("/login" as never)}
        />
      ) : (
        <Card padded>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <BrandLogo stacked size={44} />
          </View>
          <AppInput
            label="Email address"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            editable={!busy}
            onSubmitEditing={() => void submit()}
          />
          <Button label={busy ? "Sending…" : "Send reset link"} full loading={busy} onPress={() => void submit()} />
          <View style={{ height: 12 }} />
          <AppText
            variant="bodySm"
            style={{ textAlign: "center" }}
            onPress={() => router.replace("/login" as never)}
          >
            Remembered it? <AppText variant="bodySm" style={{ fontWeight: "700" }}>Log in</AppText>
          </AppText>
        </Card>
      )}
    </Screen>
  );
}
