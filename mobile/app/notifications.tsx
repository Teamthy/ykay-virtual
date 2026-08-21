import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { ErrorState } from "@/src/components/ui/ErrorState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, radius, spacing, type } from "@/src/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem as Notif,
} from "@/src/lib/notifications";
import { usePolling } from "@/src/lib/realtime";
import { parseTarget, openNotification } from "@/src/lib/deeplink";

// Notifications — the priority inbox (docs/MOBILE_DASHBOARD_DIRECTION.md):
// unread count is the dominant fact (hero card with mark-all CTA), unread
// items sort first, and tapping an item deep-links to its source screen.
// Offline-cached + polled for a real-time feel.

const TYPE_ICONS: Record<string, string> = {
  LESSON_REMINDER: "alarm-outline",
  MESSAGE: "chatbubble-outline",
  ASSIGNMENT: "create-outline",
  PAYMENT: "card-outline",
  SYSTEM: "notifications-outline",
};

export default function Notifications() {
  const { colors } = useTheme();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setNotifs(await getNotifications());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(useCallback(() => void load(), [load]));
  usePolling(load, { intervalMs: 15000, enabled: !error }); // real-time-ish refresh

  const markRead = async (n: Notif) => {
    void Haptics.selectionAsync().catch(() => {});
    await markNotificationRead(n.id);
    setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    // Deep-link: tap a notification to open the related screen (message thread,
    // course, receipt, etc.).
    openNotification(parseTarget(n.data));
  };

  const readAll = async () => {
    await markAllNotificationsRead();
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
  };

  const unread = notifs.filter((n) => !n.is_read).length;

  // Unread-first ordering (priority inbox).
  const ordered = useMemo(
    () =>
      [...notifs].sort((a, b) => {
        if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [notifs]
  );

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader
        eyebrow="INBOX"
        title="Notifications"
        subtitle={unread > 0 ? `You have ${unread} unread` : "You're all caught up"}
      />

      {/* B. Priority summary — unread is the dominant fact */}
      {!loading && unread > 0 && (
        <Animated.View entering={FadeInDown.delay(60).springify().damping(16)}>
          <LinearGradient colors={[colors.navy, colors.navyDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={{ flex: 1 }}>
              <AppText variant="label" style={styles.heroEyebrow}>
                NEEDS ATTENTION
              </AppText>
              <AppText variant="display" style={styles.heroAmount}>
                {unread}
              </AppText>
              <AppText style={styles.heroCap}>unread {unread === 1 ? "notification" : "notifications"}</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void readAll()}
              style={[styles.heroGhost, { borderColor: "rgba(255,255,255,0.28)" }]}
            >
              <AppText style={{ color: colors.white, fontFamily: fonts.bodyBold, fontWeight: "700" }}>Mark all read</AppText>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      )}

      {loading ? (
        <Animated.View entering={FadeInUp.delay(80)}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={84} style={{ marginBottom: spacing.sm }} />
          ))}
        </Animated.View>
      ) : error ? (
        <ErrorState title="Couldn't load notifications" message={error} onRetry={() => void load()} />
      ) : notifs.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="No notifications yet"
          description="Lesson reminders, tutor messages and payment updates land here."
        />
      ) : (
        <View style={styles.list}>
          {ordered.map((n, i) => (
            <Animated.View key={n.id} entering={FadeInUp.delay(100 + i * 50).springify().damping(18)}>
              <Card onPress={() => void markRead(n)} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconTile, { backgroundColor: n.is_read ? colors.ink[100] : colors.greenLight }]}>
                    <Ionicons
                      name={(TYPE_ICONS[n.type] ?? "notifications-outline") as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={n.is_read ? colors.ink[500] : colors.deep}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.titleRow}>
                      <AppText variant="h3" style={{ flex: 1, fontFamily: n.is_read ? fonts.body : fonts.bodyBold }}>
                        {n.title}
                      </AppText>
                      {!n.is_read && <View style={[styles.dot, { backgroundColor: colors.green }]} />}
                    </View>
                    {n.body ? (
                      <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 4, lineHeight: 18 }}>
                        {n.body}
                      </AppText>
                    ) : null}
                    <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 6 }}>
                      {new Date(n.created_at).toLocaleString()}
                    </AppText>
                  </View>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroEyebrow: { color: "#70F250", letterSpacing: 1.4, fontSize: type.caption },
  heroAmount: { color: "#FFFFFF", fontSize: 36, marginTop: 4 },
  heroCap: { color: "rgba(255,255,255,0.72)", fontSize: type.bodySm, marginTop: 2 },
  heroGhost: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  list: { gap: 10 },
  card: { padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
