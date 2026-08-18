import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { colors } from "@/src/lib/theme";
import { getConversations, type ConversationItem } from "@/src/lib/messaging";
import { usePolling } from "@/src/lib/realtime";

// Messages — booking/cohort-scoped conversations with tutors, parents and
// learners. Direct contact outside these threads is not possible. Polled at
// short intervals for a real-time feel (no websocket transport), and
// offline-cached so the last thread list stays readable.

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getConversations();
      setConversations(list);
    } catch {
      setConversations((prev) => prev); // keep stale cache
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(useCallback(() => void load(), [load]));
  usePolling(load, { intervalMs: 8000 }); // real-time-ish refresh while mounted

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader
        eyebrow="Messages"
        title="Conversations"
        subtitle="Your booking-scoped chats with tutors, parents and learners."
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No conversations yet"
          description="A thread opens when a lesson or cohort connects you with a tutor, parent or learner."
        />
      ) : (
        conversations.map((c) => (
          <Card key={c.id} onPress={() => router.push(`/messages/${c.id}` as never)} padded style={styles.row}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={16} color={colors.navy} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="h3">{c.other_user_name ?? c.subject ?? "Conversation"}</AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }} numberOfLines={1}>
                {c.last_message ?? (c.is_closed ? "Conversation closed" : "No messages yet")}
              </AppText>
            </View>
            {(c.unread_count ?? 0) > 0 && (
              <View style={styles.unread}>
                <AppText variant="caption" style={{ color: colors.ink[900], fontWeight: "800" }}>
                  {c.unread_count}
                </AppText>
              </View>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  unread: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
});
