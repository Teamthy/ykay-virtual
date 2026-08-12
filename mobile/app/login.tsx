import { useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch, setToken, registerDevice } from "@/src/lib/api";

// Login — email + password against the shared backend. Native token auth
// (POST /auth/login/mobile) is wired here as soon as it ships (M4); until
// then the session cookie flow works on web preview.

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email || !password) return Alert.alert("Missing details", "Enter your email and password.");
    setBusy(true);
    try {
      // M4: native token auth — the raw session token is returned in the
      // body and stored in the OS keychain; every request carries Bearer.
      const res = await apiFetch<{ token: string; user: { id: string; email: string; roles: string[] } }>("/auth/login/mobile", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await setToken(res.data.token);
      await registerDevice();
      router.replace("/home");
    } catch (e) {
      Alert.alert("Login failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Log in to continue your learning.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email address"
        placeholderTextColor={colors.ink[400]}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.ink[400]}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.btn} onPress={() => void submit()} disabled={busy}>
        <Text style={styles.btnText}>{busy ? "Logging in…" : "Log in"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, padding: 24, justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800", color: colors.navy },
  sub: { fontSize: 14, color: colors.ink[500], marginTop: 6, marginBottom: 24 },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1,
    borderColor: "#E8E4DA", paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, marginBottom: 12,
  },
  btn: {
    backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
  },
  btnText: { color: colors.ink[900], fontWeight: "800", fontSize: 15 },
});
