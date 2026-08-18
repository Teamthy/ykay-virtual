import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { colors, radius } from "@/src/lib/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem as Notif,
} from "@/src/lib/notifications";
import { usePolling } from "@/src/lib/realtime";

// Notifications — premium notification centre: list, unread indicator,
// mark read / read-all. Offline-cached + polled for a real-time feel.

const TYPE_ICONS: Record<string, string> = {
  LESSON_REMINDER: "alarm-outline",
  MESSAGE: "chatbubble-outline",
  ASSIGNMENT: "create-outline",
  PAYMENT: "card-outline",
  SYSTEM: "notifications-outline",
};

export default function Notifications() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
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

  useFocusEffect(useCallback(() => void load(), [load]));
  usePolling(load, { intervalMs: 15000, enabled: !error }); // real-time-ish refresh

  const markRead = async (id: string) => {
    void Haptics.selectionAsync().catch(() => {});
    await markNotificationRead(id);
    setNotifs((n) => n.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
  };

  const readAll = async () => {
    await markAllNotificationsRead();
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
  };

  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="INBOX"
        title="Notifications"
        subtitle={unread > 0 ? `You have ${unread} unread` : "You're all caught up"}
      />

      {unread > 0 && (
        <Animated.View entering={FadeInUp.delay(60)}>
          <Button label={`Mark all as read (${unread})`} variant="ghost" style={{ alignSelf: "flex-start", marginBottom: 12 }} onPress={() => void readAll()} />
        </Animated.View>
      )}

      {loading ? (
        <Animated.View entering={FadeInUp.delay(80)}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.skeleton, { opacity: 1 - i * 0.25 }]} />
          ))}
        </Animated.View>
      ) : error ? (
        <View style={styles.stateCard}>
          <AppText style={{ fontSize: 30 }}>⚠️</AppText>
          <AppText variant="h3" style={{ marginTop: 8 }}>
            Couldn't load notifications
          </AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 4 }}>
            {error}
          </AppText>
          <Button label="Try again" variant="dark" style={{ marginTop: 16, alignSelf: "center" }} onPress={() => void load()} />
        </View>
      ) : notifs.length === 0 ? (
        <View style={styles.stateCard}>
          <AppText style={{ fontSize: 34 }}>🔕</AppText>
          <AppText variant="h3" style={{ textAlign: "center", marginTop: 10 }}>
            No notifications yet
          </AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 6, lineHeight: 19 }}>
            Lesson reminders and tutor messages land here.
          </AppText>
        </View>
      ) : (
        <View style={styles.list}>
          {notifs.map((n, i) => (
            <Animated.View key={n.id} entering={FadeInUp.delay(100 + i * 50).springify().damping(18)}>
              <Card
                onPress={() => void markRead(n.id)}
                style={!n.is_read ? { ...styles.card, ...styles.cardUnread } : styles.card}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.iconTile, !n.is_read && styles.iconTileUnread]}>
                    <Ionicons name={(TYPE_ICONS[n.type] ?? "notifications-outline") as keyof typeof Ionicons.glyphMap} size={18} color={colors.navy} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="h3">{n.title}</AppText>
                    {n.body ? (
                      <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 4, lineHeight: 18 }}>
                        {n.body}
                      </AppText>
                    ) : null}
                    <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 6 }}>
                      {new Date(n.created_at).toLocaleString()}
                    </AppText>
                  </View>
                  {!n.is_read && <View style={styles.dot} />}
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
  skeleton: { height: 84, borderRadius: radius.lg, backgroundColor: colors.ink[100], marginBottom: 12 },
  stateCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: "center",
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  list: { gap: 10 },
  card: { padding: 16 },
  cardUnread: { borderWidth: 1, borderColor: colors.gold, backgroundColor: "#FFFCF0" },
  cardTop: { flexDirection: "row", alignItems: "center" },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink[50],
    alignItems: "center",
    justifyContent: "center",
  },
  iconTileUnread: { backgroundColor: colors.goldLight },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
});
