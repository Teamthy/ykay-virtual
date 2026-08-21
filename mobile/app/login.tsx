import { useState } from "react";
import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { Screen } from "@/src/components/ui/Screen";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { BrandLogo } from "@/src/components/BrandLogo";
import { useTheme } from "@/src/lib/theme-context";
import { layout } from "@/src/lib/theme";
import { apiFetch, setToken, registerDevice } from "@/src/lib/api";

type LoginUser = { id: string; email: string; roles: string[] };
type LoginResponse = { token?: string; mfa_required?: boolean; user: LoginUser };

export default function Login() {
  const { colors } = useTheme();
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
      const res = await apiFetch<LoginResponse>(
        "/auth/login/mobile",
        { method: "POST", body: JSON.stringify({ email, password }) }
      );
      if (res.data.mfa_required) {
        // Admin accounts (ACADEMIC_ADMIN / SUPER_ADMIN) require an emailed
        // second factor that the mobile app does not handle yet.
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return Alert.alert(
          "Check your email",
          "This admin account requires an emailed verification code, which the mobile app doesn't handle yet. Finish the admin login on the web — or sign in here with a learner, parent or tutor account."
        );
      }
      await setToken(res.data.token as string);
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
        <Animated.View entering={FadeIn.delay(40).duration(240)}>
          <BrandLogo stacked size={52} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(80).duration(240)} style={styles.headingWrap}>
          <AppText variant="h1">Welcome back</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 6, marginBottom: 28 }}>
            Log in to continue your learning.
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(160).duration(240)}>
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

        <Animated.View entering={FadeIn.delay(240).duration(240)} style={{ marginTop: 8 }}>
          <Button label={busy ? "Logging in…" : "Log in"} onPress={() => void submit()} loading={busy} full />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(300).duration(240)} style={{ marginTop: 16, alignItems: "center" }}>
          <AppText
            variant="bodySm"
            style={{ color: colors.navy, fontWeight: "700" }}
            onPress={() => router.push("/forgot-password" as never)}
          >
            Forgot password?
          </AppText>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center", maxWidth: layout.contentMaxWidth, width: "100%", alignSelf: "center" },
  headingWrap: { marginTop: 28 },
});
