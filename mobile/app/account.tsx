import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch, setToken } from "@/src/lib/api";

// Account — standard-LMS account screen (M4): session profile, linked
// learners, logout (clears the SecureStore token).

type Me = { id: string; email: string; roles: string[]; first_name?: string };
type Learner = { id: string; first_name: string; last_name?: string; current_level?: string };

export default function Account() {
  const [me, setMe] = useState<Me | null>(null);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [m, l] = await Promise.all([
        apiFetch<Me>("/auth/me").catch(() => ({ data: null })),
        apiFetch<Learner[]>("/me/learners").catch(() => ({ data: [] })),
      ]);
      setMe(m.data);
      setLearners(l.data ?? []);
    } catch {
      // session gone — login screen
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    } finally {
      await setToken(null);
      router.replace("/login");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.profileCard}>
        <Text style={styles.avatar}>{me?.first_name?.[0] ?? me?.email?.[0]?.toUpperCase() ?? "?"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{me?.first_name ?? me?.email ?? "Signed in"}</Text>
          <Text style={styles.email}>{me?.email}</Text>
          <Text style={styles.roles}>{(me?.roles ?? []).join(" · ")}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My learners</Text>
      {learners.length === 0 ? (
        <Text style={styles.empty}>No learners linked yet — add one in onboarding on the web app.</Text>
      ) : (
        learners.map((l) => (
          <View key={l.id} style={styles.learnerCard}>
            <Text style={styles.learnerName}>
              {l.first_name} {l.last_name ?? ""}
            </Text>
            {l.current_level ? <Text style={styles.learnerLevel}>{l.current_level}</Text> : null}
          </View>
        ))
      )}

      <Pressable style={styles.logoutBtn} onPress={() => void logout()}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, padding: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  profileCard: { flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E8E4DA", padding: 18 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.navy, color: colors.white, textAlign: "center", lineHeight: 52, fontSize: 22, fontWeight: "800" },
  name: { fontSize: 17, fontWeight: "800", color: colors.ink[900] },
  email: { fontSize: 13, color: colors.ink[500], marginTop: 2 },
  roles: { fontSize: 11, color: colors.goldDark, fontWeight: "700", marginTop: 6 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.navy, marginTop: 28, marginBottom: 12 },
  empty: { color: colors.ink[500], lineHeight: 20 },
  learnerCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: "#E8E4DA", padding: 14, marginBottom: 8, flexDirection: "row", justifyContent: "space-between" },
  learnerName: { fontSize: 15, fontWeight: "700", color: colors.ink[900] },
  learnerLevel: { fontSize: 13, color: colors.ink[500] },
  logoutBtn: { marginTop: 32, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.md, padding: 14, alignItems: "center" },
  logoutText: { color: colors.danger, fontWeight: "700", fontSize: 15 },
});
