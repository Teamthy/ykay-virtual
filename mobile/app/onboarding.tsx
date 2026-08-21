import { useState } from "react";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/src/components/ui/AppText";
import { AppInput } from "@/src/components/ui/AppInput";
import { Button } from "@/src/components/ui/Button";
import { Screen } from "@/src/components/ui/Screen";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing } from "@/src/lib/theme";
import { BrandLogo } from "@/src/components/BrandLogo";
import { apiFetch, setToken, registerDevice } from "@/src/lib/api";

// Onboarding — mirrors the web 7-step flow in a compact 4-screen version:
//   1. name + email     2. verify code (6-digit)
//   3. role             4. done → dashboard
// Clean, premium form styling with the shared AppInput/Button primitives.

const ROLES = [
  { value: "PARENT", label: "Parent", icon: "people-outline" as const },
  { value: "STUDENT", label: "Student", icon: "school-outline" as const },
  { value: "TUTOR", label: "Tutor", icon: "create-outline" as const },
  { value: "INSTITUTION", label: "School / Company", icon: "business-outline" as const },
] as const;

export default function Onboarding() {
  const { colors } = useTheme();
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

  const titles = {
    1: "Create your account",
    2: "Verify your email",
    3: "How will you use NUVORA?",
    4: "You're all set!",
  } as const;

  return (
    <Screen scroll>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", marginBottom: spacing.md }}>
          <BrandLogo stacked size={44} />
        </View>
        <AppText variant="caption" style={[styles.step, { color: colors.greenDark }]}>
          Step {step} of 4
        </AppText>
        <AppText variant="h1" style={styles.title}>
          {titles[step as keyof typeof titles]}
        </AppText>

        {step === 1 && (
          <View style={styles.form}>
            <AppInput label="Full name" placeholder="Jane Doe" value={name} onChangeText={setName} autoCapitalize="words" />
            <AppInput label="Email address" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <Button label={busy ? "Creating…" : "Continue"} onPress={() => void createAccount()} loading={busy} full style={{ marginTop: spacing.sm }} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <AppText variant="bodySm" style={styles.hint}>
              We emailed a 6-digit code to {email}.
            </AppText>
            <AppInput
              label="Verification code"
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
              style={styles.codeInput}
            />
            <Button label={busy ? "Verifying…" : "Verify email"} onPress={() => void verify()} loading={busy} disabled={code.length !== 6} full style={{ marginTop: spacing.sm }} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <View
                  key={r.value}
                  style={[
                    styles.roleCard,
                    { borderColor: active ? colors.greenDark : colors.border, backgroundColor: active ? colors.greenLight : colors.surface },
                  ]}
                >
                  <Pressable onPress={() => setRole(r.value)} style={styles.roleInner} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={r.label}>
                    <View style={[styles.roleIconWrap, { backgroundColor: active ? colors.surface : colors.ink[50] }]}>
                      <Ionicons name={r.icon} size={20} color={active ? colors.greenDark : colors.ink[600]} />
                    </View>
                    <AppText variant="heading" style={{ flex: 1 }}>
                      {r.label}
                    </AppText>
                    <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={20} color={active ? colors.green : colors.ink[200]} />
                  </Pressable>
                </View>
              );
            })}
            <Button label={busy ? "Saving…" : "Continue"} onPress={() => void pickRole()} loading={busy} disabled={!role} full style={{ marginTop: spacing.sm }} />
          </View>
        )}

        {step === 4 && (
          <View style={styles.form}>
            <View style={[styles.successIcon, { backgroundColor: colors.green }]}>
              <Ionicons name="checkmark" size={40} color={colors.ink[950]} />
            </View>
            <AppText variant="bodySm" style={styles.hint}>
              {name.split(" ")[0]}, your account is ready. Explore programmes, cohorts and tutors.
            </AppText>
            <Button label="Go to my dashboard" onPress={() => router.replace("/home")} full style={{ marginTop: spacing.sm }} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingTop: spacing.xxl, paddingBottom: spacing.xxl },
  step: { letterSpacing: 2, textTransform: "uppercase", marginBottom: spacing.xs },
  title: { marginBottom: spacing.xl },
  form: { gap: spacing.sm },
  hint: { lineHeight: 19 },
  codeInput: { fontSize: 22, letterSpacing: 8, textAlign: "center", fontVariant: ["tabular-nums"] },
  roleCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  roleInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 56,
  },
  roleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
});
