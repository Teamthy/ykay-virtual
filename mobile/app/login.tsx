import { useState } from "react";
import { router } from "expo-router";
import { Alert, Modal, Pressable, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { BrandLogo } from "@/src/components/BrandLogo";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, layout, radius, spacing } from "@/src/lib/theme";
import { apiFetch, getGoogleAuthURL, setToken, registerDevice } from "@/src/lib/api";

// Login — password, login-code and Google (WebView OAuth). The Google flow:
// backend consent URL → WebView → Google redirects to the API callback page →
// that page posts the session token back via window.ReactNativeWebView.

type LoginUser = { id: string; email: string; roles: string[] };
type LoginResponse = { token?: string; mfa_required?: boolean; user: LoginUser };

// Google blocks OAuth in embedded webviews that present a webview UA;
// a real browser UA string satisfies the check.
const BROWSER_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export default function Login() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleURL, setGoogleURL] = useState<string | null>(null);

  const finishSession = (token: string, roles: string[]) => {
    void setToken(token);
    void registerDevice();
    router.replace(roles.includes("STUDENT") ? "/lms" : "/home");
  };

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
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return Alert.alert(
          "Check your email",
          "This admin account requires an emailed verification code, which the mobile app doesn't handle yet. Finish the admin login on the web — or sign in here with a learner, parent or tutor account."
        );
      }
      finishSession(res.data.token as string, res.data.user.roles);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert("Login failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const startGoogle = async () => {
    void Haptics.selectionAsync().catch(() => {});
    try {
      const url = await getGoogleAuthURL();
      setGoogleURL(url);
    } catch (e) {
      Alert.alert("Google sign-in unavailable", e instanceof Error ? e.message : "Try email login instead.");
    }
  };

  const onGoogleMessage = (ev: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(ev.nativeEvent.data) as { type?: string; token?: string };
      if (data.type === "nuvora_google_auth" && data.token) {
        setGoogleURL(null);
        // Store the token first (apiFetch attaches it from SecureStore),
        // then fetch the profile to route correctly.
        void setToken(data.token)
          .then(() => apiFetch<LoginUser>("/auth/me"))
          .then((me) => finishSession(data.token as string, me.data.roles))
          .catch(() => finishSession(data.token as string, []));
      }
    } catch {
      // ignore non-JSON messages
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

        {/* Google sign-in (WebView OAuth) */}
        <Animated.View entering={FadeIn.delay(280).duration(240)} style={{ marginTop: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            onPress={() => void startGoogle()}
            style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="logo-google" size={18} color={colors.deep} />
            <AppText variant="label" style={{ color: colors.ink[700] }}>
              Continue with Google
            </AppText>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(320).duration(240)} style={{ marginTop: 16, alignItems: "center" }}>
          <AppText
            variant="bodySm"
            style={{ color: colors.navy, fontFamily: fonts.bodyBold, fontWeight: "700" }}
            onPress={() => router.push("/forgot-password" as never)}
          >
            Forgot password?
          </AppText>
        </Animated.View>
      </View>

      {/* Google OAuth WebView */}
      <Modal visible={!!googleURL} animationType="slide" onRequestClose={() => setGoogleURL(null)}>
        <View style={[styles.webRoot, { backgroundColor: colors.bg }]}>
          <View style={[styles.webBar, { backgroundColor: colors.deep }]}>
            <Pressable onPress={() => setGoogleURL(null)} accessibilityRole="button" accessibilityLabel="Cancel Google sign-in" style={styles.webClose}>
              <AppText style={{ color: colors.white, fontFamily: fonts.bodyBold, fontWeight: "700" }}>Cancel</AppText>
            </Pressable>
            <AppText style={{ color: colors.white, fontFamily: fonts.bodyBold }}>Google sign-in</AppText>
            <View style={{ width: 56 }} />
          </View>
          {googleURL ? (
            <WebView
              source={{ uri: googleURL }}
              userAgent={BROWSER_UA}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              onMessage={onGoogleMessage}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <AppText variant="bodySm" style={{ color: colors.ink[500] }}>
                    Loading Google…
                  </AppText>
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center", maxWidth: layout.contentMaxWidth, width: "100%", alignSelf: "center" },
  headingWrap: { marginTop: 28 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  webRoot: { flex: 1 },
  webBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: 54,
    paddingBottom: spacing.sm,
  },
  webClose: { width: 56 },
});
