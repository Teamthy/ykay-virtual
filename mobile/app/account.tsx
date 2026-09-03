import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Screen } from "@/src/components/ui/Screen";
import { TabLayout } from "@/src/components/TabLayout";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, type ThemeMode } from "@/src/lib/theme-context";
import { radius, spacing, type ThemeColors } from "@/src/lib/theme";
import { apiFetch, setToken } from "@/src/lib/api";
import { currentAppVersion } from "@/src/lib/updates";

// Profile — grouped settings (per the mobile UI spec):
//   profile header → account → learning → notifications & privacy → support
// Related settings are grouped into sections, not an endless flat list.

type Me = {
  id: string;
  email: string;
  roles: string[];
  first_name?: string;
  last_name?: string;
};
type Learner = {
  id: string;
  first_name: string;
  last_name?: string;
  current_level?: string;
};

type IconName = keyof typeof Ionicons.glyphMap;

type MenuItem = { href: string; label: string; icon: IconName; desc: string };

// Grouped menu (replaces the flat 14-item list).
const GROUPS: { title: string; items: MenuItem[] }[] = [
  {
    title: "Account",
    items: [
      {
        href: "/edit-profile",
        label: "Edit profile",
        icon: "person-outline",
        desc: "Name, phone, timezone",
      },
      {
        href: "/learners",
        label: "Learners",
        icon: "people-outline",
        desc: "Children linked to your account",
      },
    ],
  },
  {
    title: "Learning",
    items: [
      {
        href: "/my-lessons",
        label: "My lessons",
        icon: "calendar-outline",
        desc: "Upcoming & past sessions",
      },
      {
        href: "/referrals",
        label: "Referrals",
        icon: "gift-outline",
        desc: "Invite & earn",
      },
      {
        href: "/payments",
        label: "Payments",
        icon: "card-outline",
        desc: "Orders & escrow history",
      },
    ],
  },
  {
    title: "Notifications & privacy",
    items: [
      {
        href: "/notifications",
        label: "Notifications",
        icon: "notifications-outline",
        desc: "Reminders and updates",
      },
      {
        href: "/devices",
        label: "Devices",
        icon: "phone-portrait-outline",
        desc: "Notification devices",
      },
      {
        href: "/privacy",
        label: "Privacy",
        icon: "lock-closed-outline",
        desc: "How we handle your data",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        href: "/contact",
        label: "Contact support",
        icon: "chatbox-ellipses-outline",
        desc: "Create a support ticket",
      },
      {
        href: "/help",
        label: "Help & FAQs",
        icon: "help-circle-outline",
        desc: "Answers & guides",
      },
    ],
  },
];

export default function Account() {
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
    Alert.alert(
      "Log out?",
      "You'll need to log in again to access your account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch("/auth/logout", { method: "POST" }).catch(
                () => undefined,
              );
            } finally {
              await setToken(null);
              router.replace("/login");
            }
          },
        },
      ],
    );
  };

  const initial = me?.first_name?.[0] ?? me?.email?.[0]?.toUpperCase() ?? "?";

  if (loading) {
    return (
      <TabLayout>
        <Screen scroll>
          <Skeleton width="100%" height={120} radius={radius.lg} />
          <Skeleton height={20} style={{ marginTop: spacing.xl }} />
          <Skeleton height={16} style={{ marginTop: spacing.md }} />
          <Skeleton height={16} style={{ marginTop: spacing.sm }} />
          <Skeleton height={16} style={{ marginTop: spacing.sm }} />
        </Screen>
      </TabLayout>
    );
  }

  return (
    <TabLayout>
      <Screen scroll>
        {/* Profile header — light surface, not a gradient */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>{initial}</AppText>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <AppText variant="h2">
              {me?.first_name?.trim()
                ? `${me.first_name}${me.last_name ? ` ${me.last_name}` : ""}`
                : "Signed in"}
            </AppText>
            {me?.email ? (
              <AppText
                variant="bodySm"
                style={{ color: colors.ink[500], marginTop: 2 }}
              >
                {me.email}
              </AppText>
            ) : null}
            {(me?.roles ?? []).length > 0 && (
              <View style={styles.roleRow}>
                {(me?.roles ?? []).map((r) => (
                  <View key={r} style={styles.rolePill}>
                    <AppText variant="caption" style={styles.roleText}>
                      {r}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Learners */}
        <AppText variant="label" style={styles.sectionTitle}>
          MY LEARNERS
        </AppText>
        {learners.length === 0 ? (
          <EmptyState
            icon="school-outline"
            title="No learners yet"
            description="Learners you link will appear here so you can track their lessons, attendance and progress."
          />
        ) : (
          learners.map((l) => (
            <Card key={l.id} style={styles.learnerCard}>
              <View style={styles.learnerIcon}>
                <Ionicons name="school-outline" size={16} color={colors.navy} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <AppText variant="h3">
                  {l.first_name} {l.last_name ?? ""}
                </AppText>
                {l.current_level ? (
                  <AppText
                    variant="caption"
                    style={{ color: colors.ink[400], marginTop: 2 }}
                  >
                    {l.current_level}
                  </AppText>
                ) : null}
              </View>
            </Card>
          ))
        )}

        {/* Appearance — light / dark / system */}
        <AppText variant="label" style={styles.sectionTitle}>
          APPEARANCE
        </AppText>
        <Card style={styles.groupCard}>
          <View style={styles.menuRow}>
            <View
              style={[styles.menuIcon, { backgroundColor: colors.greenLight }]}
            >
              <Ionicons
                name={
                  mode === "dark"
                    ? "moon-outline"
                    : mode === "light"
                      ? "sunny-outline"
                      : "phone-portrait-outline"
                }
                size={18}
                color={colors.deep}
              />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <AppText variant="heading">Theme</AppText>
              <AppText
                variant="caption"
                style={{ color: colors.ink[400], marginTop: 2 }}
              >
                Dark, light or follow your device
              </AppText>
            </View>
          </View>
          <View style={styles.themeRow}>
            {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
              <View
                key={m}
                accessibilityRole="button"
                accessibilityLabel={`Theme ${m}`}
                onTouchEnd={() => setMode(m)}
                style={[
                  styles.themeChip,
                  {
                    borderColor: mode === m ? colors.greenDark : colors.border,
                    backgroundColor:
                      mode === m ? colors.greenLight : "transparent",
                  },
                ]}
              >
                <AppText
                  variant="label"
                  style={{
                    color: mode === m ? colors.deep : colors.ink[500],
                    textTransform: "capitalize",
                  }}
                >
                  {m}
                </AppText>
              </View>
            ))}
          </View>
        </Card>

        {/* Grouped settings */}
        {GROUPS.map((group) => (
          <View key={group.title}>
            <AppText variant="label" style={styles.sectionTitle}>
              {group.title.toUpperCase()}
            </AppText>
            <Card style={styles.groupCard}>
              {group.items.map((item, i) => (
                <View key={item.href}>
                  <View
                    style={styles.menuRow}
                    accessibilityRole="button"
                    onTouchEnd={() => router.push(item.href as never)}
                  >
                    <View style={styles.menuIcon}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={colors.deep}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <AppText variant="heading">{item.label}</AppText>
                      <AppText
                        variant="caption"
                        style={{ color: colors.ink[400], marginTop: 2 }}
                      >
                        {item.desc}
                      </AppText>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.ink[300]}
                    />
                  </View>
                  {i < group.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </Card>
          </View>
        ))}

        <View style={styles.logout}>
          <Button
            label="Log out"
            variant="secondary"
            full
            onPress={() => void logout()}
          />
          <AppText
            variant="caption"
            style={{
              textAlign: "center",
              marginTop: spacing.lg,
              color: colors.ink[400],
            }}
          >
            YK-Virtual · v{currentAppVersion()}
          </AppText>
        </View>
      </Screen>
    </TabLayout>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.green,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 26, fontWeight: "800", color: colors.ink[950] },
    roleRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: spacing.xs,
      flexWrap: "wrap",
    },
    rolePill: {
      backgroundColor: colors.greenLight,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
    },
    roleText: { color: colors.greenDark, fontWeight: "700" },
    sectionTitle: {
      color: colors.ink[500],
      letterSpacing: 1.1,
      fontSize: 12,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    learnerCard: {
      padding: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    learnerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.greenLight,
      alignItems: "center",
      justifyContent: "center",
    },
    groupCard: { paddingHorizontal: spacing.md, marginBottom: spacing.xs },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      minHeight: 56,
    },
    menuIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.greenLight,
      alignItems: "center",
      justifyContent: "center",
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 36 + spacing.sm,
    },
    logout: { marginTop: spacing.lg, marginBottom: spacing.xxl },
    themeRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingBottom: spacing.md,
    },
    themeChip: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1.5,
      alignItems: "center",
    },
  });
