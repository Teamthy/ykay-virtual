import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { TabBar } from "@/src/components/TabBar";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch, setToken } from "@/src/lib/api";

// Account — premium profile + linked learners + settings + logout.

type Me = { id: string; email: string; roles: string[]; first_name?: string; last_name?: string };
type Learner = { id: string; first_name: string; last_name?: string; current_level?: string };

const MENU = [
  { href: "/edit-profile", label: "Edit profile", icon: "person-outline", desc: "Name, phone, timezone" },
  { href: "/learners", label: "Learners", icon: "people-outline", desc: "Children linked to your account" },
  { href: "/referrals", label: "Referrals", icon: "gift-outline", desc: "Invite & earn" },
  { href: "/payments", label: "Payments", icon: "card-outline", desc: "Orders & escrow history" },
  { href: "/become-tutor", label: "Become a tutor", icon: "school-outline", desc: "Teach on NUVORA" },
  { href: "/pricing", label: "Pricing", icon: "pricetag-outline", desc: "Plans & protection" },
  { href: "/careers", label: "Careers", icon: "briefcase-outline", desc: "Join the team" },
  { href: "/contact", label: "Contact support", icon: "chatbox-ellipses-outline", desc: "Create a support ticket" },
  { href: "/notifications", label: "Notifications", icon: "notifications-outline", desc: "Reminders and updates" },
  { href: "/help", label: "Help", icon: "help-circle-outline", desc: "FAQs & support" },
  { href: "/about", label: "About NUVORA", icon: "information-circle-outline", desc: "Who we are" },
  { href: "/privacy", label: "Privacy", icon: "lock-closed-outline", desc: "How we handle your data" },
  { href: "/terms", label: "Terms", icon: "document-text-outline", desc: "Terms of service" },
] as const;

type IconName = keyof typeof Ionicons.glyphMap;

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
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    try {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    } finally {
      await setToken(null);
      router.replace("/login");
    }
  };

  const initial = me?.first_name?.[0] ?? me?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <Screen scroll>
      {/* Profile hero */}
      <Animated.View entering={FadeInUp.delay(60).springify().damping(16)}>
        <LinearGradient
          colors={[colors.navy, colors.navyDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>{initial}</AppText>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <AppText variant="h2" style={{ color: colors.white }}>
              {me?.first_name?.trim() ? `${me.first_name}${me.last_name ? ` ${me.last_name}` : ""}` : me?.email ?? "Signed in"}
            </AppText>
            {me?.email ? (
              <AppText variant="bodySm" style={{ color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                {me.email}
              </AppText>
            ) : null}
            <View style={styles.roleRow}>
              {(me?.roles ?? []).map((r) => (
                <View key={r} style={styles.rolePill}>
                  <AppText variant="caption" style={styles.roleText}>
                    {r}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Learners */}
      <AppText variant="label" style={styles.sectionTitle}>
        MY LEARNERS
      </AppText>
      {learners.length === 0 ? (
        <View style={styles.stateCard}>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", lineHeight: 19 }}>
            No learners linked yet — add one in onboarding on the web app.
          </AppText>
        </View>
      ) : (
        learners.map((l, i) => (
          <Animated.View key={l.id} entering={FadeInUp.delay(120 + i * 60).springify().damping(18)}>
            <Card style={styles.learnerCard}>
              <View style={styles.learnerIcon}>
                <Ionicons name="school-outline" size={16} color={colors.navy} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="h3">
                  {l.first_name} {l.last_name ?? ""}
                </AppText>
                {l.current_level ? (
                  <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                    {l.current_level}
                  </AppText>
                ) : null}
              </View>
            </Card>
          </Animated.View>
        ))
      )}

      {/* Menu */}
      <AppText variant="label" style={styles.sectionTitle}>
        MORE
      </AppText>
      {MENU.map((item) => (
        <Card key={item.href} onPress={() => router.push(item.href as never)} style={styles.menuCard}>
          <Ionicons name={item.icon as IconName} size={20} color={colors.navy} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="h3">{item.label}</AppText>
            <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
              {item.desc}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.goldDark} />
        </Card>
      ))}

      <View style={styles.logout}>
        <Button label="Log out" variant="secondary" full onPress={() => void logout()} />
      </View>

      <View style={styles.tab}>
        <TabBar />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    padding: 22,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 26, fontWeight: "800", color: colors.navy },
  roleRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  rolePill: { backgroundColor: "rgba(112,242,80,0.18)", borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  roleText: { color: colors.gold, fontWeight: "800" },
  sectionTitle: { color: colors.goldDark, letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  stateCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: "center",
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  learnerCard: { padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 10 },
  learnerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuCard: { padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 10 },
  logout: { marginTop: 8 },
  tab: { marginTop: 24 },
});
