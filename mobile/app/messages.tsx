import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, radius, spacing, type } from "@/src/lib/theme";
import { getConversations, type ConversationItem } from "@/src/lib/messaging";
import { usePolling } from "@/src/lib/realtime";

// Messages — the conversation inbox (docs/MOBILE_DASHBOARD_DIRECTION.md):
// unread total is the dominant fact (summary card), unread threads sort
// first, and each thread navigates to its chat. Booking/cohort-scoped
// conversations only; polled for a real-time feel with offline cache.

export default function MessagesScreen() {
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getConversations();
      setConversations(list);
    } catch {
      setConversations((prev) => prev); // keep stale cache
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
  usePolling(load, { intervalMs: 8000 }); // real-time-ish refresh while mounted

  const unreadTotal = useMemo(() => conversations.reduce((n, c) => n + (c.unread_count ?? 0), 0), [conversations]);

  // Unread-first ordering.
  const ordered = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        if ((a.unread_count ?? 0) !== (b.unread_count ?? 0)) return (b.unread_count ?? 0) - (a.unread_count ?? 0);
        return 0;
      }),
    [conversations]
  );

  if (loading) {
    return (
      <Screen scroll>
        <Skeleton height={110} />
        <Skeleton height={72} style={{ marginTop: spacing.lg }} />
        <Skeleton height={72} style={{ marginTop: spacing.sm }} />
      </Screen>
    );
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader
        eyebrow="Messages"
        title="Conversations"
        subtitle="Your booking-scoped chats with tutors, parents and learners."
      />

      {/* B. Unread summary — dominant fact */}
      {conversations.length > 0 && (
        <Animated.View entering={FadeInDown.delay(60).springify().damping(16)}>
          <LinearGradient colors={[colors.navy, colors.navyDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <AppText variant="label" style={styles.heroEyebrow}>
              {unreadTotal > 0 ? "UNREAD MESSAGES" : "INBOX STATUS"}
            </AppText>
            <AppText variant="display" style={styles.heroAmount}>
              {unreadTotal > 0 ? unreadTotal : "0"}
            </AppText>
            <AppText style={styles.heroCap}>
              {unreadTotal > 0
                ? `across ${conversations.filter((c) => (c.unread_count ?? 0) > 0).length} conversation${conversations.filter((c) => (c.unread_count ?? 0) > 0).length === 1 ? "" : "s"}`
                : "You're all caught up"}
            </AppText>
          </LinearGradient>
        </Animated.View>
      )}

      {conversations.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No conversations yet"
          description="A thread opens when a lesson or cohort connects you with a tutor, parent or learner."
        />
      ) : (
        <View style={styles.list}>
          {ordered.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInUp.delay(80 + i * 50).springify().damping(18)}>
              <Card onPress={() => router.push(`/messages/${c.id}` as never)} padded style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: (c.unread_count ?? 0) > 0 ? colors.greenLight : colors.ink[100] }]}>
                  <Ionicons name="person" size={16} color={colors.deep} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="h3" style={{ fontFamily: (c.unread_count ?? 0) > 0 ? fonts.bodyBold : undefined }}>
                    {c.other_user_name ?? c.subject ?? "Conversation"}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }} numberOfLines={1}>
                    {c.last_message ?? (c.is_closed ? "Conversation closed" : "No messages yet")}
                  </AppText>
                </View>
                {(c.unread_count ?? 0) > 0 && (
                  <View style={[styles.unread, { backgroundColor: colors.green }]}>
                    <AppText variant="caption" style={{ color: colors.ink[950], fontWeight: "800" }}>
                      {c.unread_count}
                    </AppText>
                  </View>
                )}
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
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroEyebrow: { color: "#70F250", letterSpacing: 1.4, fontSize: type.caption },
  heroAmount: { color: "#FFFFFF", fontSize: 40, marginTop: 4 },
  heroCap: { color: "rgba(255,255,255,0.72)", fontSize: type.bodySm, marginTop: 4 },
  list: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
});
