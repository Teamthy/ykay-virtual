import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { confirmPasswordReset } from "@/src/lib/account";

// Reset password — confirm the emailed token and set a new password.

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(typeof params.token === "string" ? params.token : "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (token.trim().length < 8) {
      return Alert.alert("Check the token", "Paste the full reset link or token from your email.");
    }
    if (password.length < 8) {
      return Alert.alert("Password too short", "Use at least 8 characters.");
    }
    if (password !== confirm) {
      return Alert.alert("Passwords don't match", "Re-enter your new password.");
    }
    setBusy(true);
    try {
      await confirmPasswordReset(token.trim(), password);
      Alert.alert("Password reset", "You can now log in with your new password.", [
        { text: "Log in", onPress: () => router.replace("/login" as never) },
      ]);
    } catch (e) {
      Alert.alert("Could not reset", e instanceof Error ? e.message : "The link may have expired. Request a new one.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Account recovery"
        title="Set a new password"
        subtitle="Enter the token from your reset email and choose a new password."
      />

      <Card padded>
        <AppInput
          label="Reset token"
          placeholder="Paste the code from the email"
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
          editable={!busy}
        />
        <AppInput
          label="New password"
          placeholder="At least 8 characters"
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />
        <AppInput
          label="Confirm new password"
          placeholder="Re-enter your password"
          secureTextEntry
          autoComplete="new-password"
          value={confirm}
          onChangeText={setConfirm}
          editable={!busy}
          onSubmitEditing={() => void submit()}
        />
        <View style={{ height: 8 }} />
        <Button label="Reset password" loading={busy} full onPress={() => void submit()} />
      </Card>

      <AppText variant="caption" style={{ color: colors.ink[400], textAlign: "center", marginTop: 16 }}>
        Passwords are hashed and never stored in plain text.
      </AppText>
    </Screen>
  );
}
