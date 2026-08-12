import { useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch, setToken, registerDevice } from "@/src/lib/api";

// Onboarding — mirrors the web 7-step flow in a compact 4-screen version:
//   1. name + email     2. verify code (6-digit)
//   3. role             4. done → dashboard
// State survives via React state; a native async-storage persistence layer
// lands in M3.

const ROLES = [
  { value: "PARENT", label: "Parent", icon: "👪" },
  { value: "STUDENT", label: "Student", icon: "🎓" },
  { value: "TUTOR", label: "Tutor", icon: "✍️" },
  { value: "INSTITUTION", label: "School / Company", icon: "🏫" },
] as const;

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const createAccount = async () => {
    if (!name.trim() || !email.includes("@")) return Alert.alert("Almost there", "Enter your name and a valid email.");
    setBusy(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: Math.random().toString(36).slice(2) + "Aa1!", roles: ["PARENT"] }),
      });
      await apiFetch("/auth/login-code/request", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setStep(2);
    } catch (e) {
      Alert.alert("Could not create account", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ token: string }>("/auth/login-code/mobile/confirm", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), code }),
      });
      await setToken(res.data.token);
      await registerDevice();
      setStep(3);
    } catch (e) {
      Alert.alert("Code invalid", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  const pickRole = async () => {
    if (!role) return;
    setBusy(true);
    try {
      await apiFetch("/auth/me/role", { method: "POST", body: JSON.stringify({ role }) });
      setStep(4);
    } catch (e) {
      Alert.alert("Could not save role", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step {step} of 4</Text>
      <Text style={styles.title}>
        {step === 1 && "Create your account"}
        {step === 2 && "Verify your email"}
        {step === 3 && "How will you use NUVORA?"}
        {step === 4 && "You're all set! 🎉"}
      </Text>

      {step === 1 && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={colors.ink[400]} value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email address" placeholderTextColor={colors.ink[400]} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Pressable style={styles.btn} onPress={() => void createAccount()} disabled={busy}>
            <Text style={styles.btnText}>{busy ? "Creating…" : "Continue"}</Text>
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View style={styles.form}>
          <Text style={styles.hint}>We emailed a 6-digit code to {email}.</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="000000"
            placeholderTextColor={colors.ink[400]}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
          />
          <Pressable style={styles.btn} onPress={() => void verify()} disabled={busy || code.length !== 6}>
            <Text style={styles.btnText}>{busy ? "Verifying…" : "Verify email"}</Text>
          </Pressable>
        </View>
      )}

      {step === 3 && (
        <View style={styles.form}>
          {ROLES.map((r) => (
            <Pressable
              key={r.value}
              style={[styles.roleCard, role === r.value && styles.roleCardActive]}
              onPress={() => setRole(r.value)}
            >
              <Text style={styles.roleIcon}>{r.icon}</Text>
              <Text style={styles.roleLabel}>{r.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.btn} onPress={() => void pickRole()} disabled={busy || !role}>
            <Text style={styles.btnText}>{busy ? "Saving…" : "Continue"}</Text>
          </Pressable>
        </View>
      )}

      {step === 4 && (
        <View style={styles.form}>
          <Text style={styles.hint}>
            {name.split(" ")[0]}, your account is ready. Explore programmes, cohorts and tutors.
          </Text>
          <Pressable style={styles.btn} onPress={() => router.replace("/home")}>
            <Text style={styles.btnText}>Go to my dashboard</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingTop: 48 },
  step: { fontSize: 12, fontWeight: "700", letterSpacing: 2, color: colors.goldDark, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "800", color: colors.navy, marginTop: 6, marginBottom: 20 },
  form: { gap: 12 },
  input: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1,
    borderColor: "#E8E4DA", paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
  },
  codeInput: { fontSize: 22, letterSpacing: 8, textAlign: "center", fontVariant: ["tabular-nums"] },
  hint: { fontSize: 13, color: colors.ink[600], lineHeight: 19 },
  btn: { backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  btnText: { color: colors.ink[900], fontWeight: "800", fontSize: 15 },
  roleCard: {
    flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 2,
    borderColor: "#E8E4DA", borderRadius: radius.lg, padding: 16, backgroundColor: colors.white,
  },
  roleCardActive: { borderColor: colors.gold, backgroundColor: colors.goldLight },
  roleIcon: { fontSize: 22 },
  roleLabel: { fontSize: 15, fontWeight: "700", color: colors.navy },
});
