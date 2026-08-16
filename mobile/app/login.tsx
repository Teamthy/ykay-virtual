import { useState } from "react";
import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Screen } from "@/src/components/ui/Screen";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { colors, layout } from "@/src/lib/theme";
import { apiFetch, setToken, registerDevice } from "@/src/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return Alert.alert("Missing details", "Enter your email and password.");
    }
    setBusy(true);
    void Haptics.selectionAsync().catch(() => {});
    try {
      const res = await apiFetch<{ token: string; user: { id: string; email: string; roles: string[] } }>(
        "/auth/login/mobile",
        { method: "POST", body: JSON.stringify({ email, password }) }
      );
      await setToken(res.data.token);
      await registerDevice();
      router.replace(res.data.user.roles.includes("STUDENT") ? "/lms" : "/home");
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert("Login failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false} padded>
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.delay(80).springify().damping(16)}>
          <AppText variant="h1">Welcome back</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 6, marginBottom: 28 }}>
            Log in to continue your learning.
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(160).springify().damping(16)}>
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
          <AppInput
            label="Password"
            placeholder="Your password"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            onSubmitEditing={() => void submit()}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify().damping(16)} style={{ marginTop: 8 }}>
          <Button label={busy ? "Logging in…" : "Log in"} onPress={() => void submit()} loading={busy} full />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center", maxWidth: layout.contentMaxWidth, width: "100%", alignSelf: "center" },
});
