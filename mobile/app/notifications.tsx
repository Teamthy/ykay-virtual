import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Notifications — standard-LMS notification centre (M4): list, unread
// badge, mark read / read-all. Session-resolved (G1.2).

type Notif = {
  id: string;
  type: string;
  title: string;
  body?: string;
  is_read: boolean;
  created_at: string;
};

export default function Notifications() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Notif[]>("/me/notifications");
      setNotifs(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const markRead = async (id: string) => {
    try {
      await apiFetch(`/me/notifications/${id}/read`, { method: "POST" });
      setNotifs((n) => n.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    } catch {
      // best-effort
    }
  };

  const readAll = async () => {
    try {
      await apiFetch("/me/notifications/read-all", { method: "POST" });
      setNotifs((n) => n.map((x) => ({ ...x, is_read: true })));
    } catch {
      // best-effort
    }
  };

  const unread = notifs.filter((n) => !n.is_read).length;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unread > 0 && (
          <Pressable onPress={() => void readAll()}>
            <Text style={styles.readAll}>Mark all read ({unread})</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={colors.gold} size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : notifs.length === 0 ? (
        <Text style={styles.empty}>No notifications yet — lesson reminders and tutor messages land here.</Text>
      ) : (
        <FlatList
          data={notifs}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable style={[styles.card, !item.is_read && styles.cardUnread]} onPress={() => void markRead(item.id)}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {!item.is_read && <View style={styles.dot} />}
              </View>
              {item.body ? <Text style={styles.cardBody}>{item.body}</Text> : null}
              <Text style={styles.cardTime}>{new Date(item.created_at).toLocaleString()}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, padding: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "800", color: colors.navy },
  readAll: { fontSize: 13, fontWeight: "700", color: colors.navy, paddingBottom: 2 },
  error: { color: colors.danger, marginTop: 24 },
  empty: { color: colors.ink[500], marginTop: 24, lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: "#E8E4DA", padding: 16 },
  cardUnread: { borderColor: colors.gold, backgroundColor: "#FFFCF0" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.ink[900], flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  cardBody: { fontSize: 13, color: colors.ink[600], marginTop: 6, lineHeight: 18 },
  cardTime: { fontSize: 11, color: colors.ink[400], marginTop: 8 },
});
