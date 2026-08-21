import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { AppText } from "@/src/components/ui/AppText";
import { radius } from "@/src/lib/theme";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";
import { getMessages, sendMessage, type TutorMessage } from "@/src/lib/tutor";

// Conversation thread — list messages and send replies. Messages are scoped to
// the booking/cohort conversation (safeguarding by design).

export default function ConversationThreadScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, msgs] = await Promise.all([
        apiFetch<{ id: string }>("/auth/me").catch(() => ({ data: null })),
        getMessages(conversationId),
      ]);
      setMyId(me.data?.id ?? null);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  }, [conversationId]);

  useFocusEffect(useCallback(() => void load(), [load]));

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendMessage(conversationId, body);
      setDraft("");
      await load();
    } catch {
      // keep draft so nothing is lost
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen scroll style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
              No messages yet. Say hello to get the conversation started.
            </AppText>
          </View>
        ) : (
          messages.map((m) => {
            const mine = m.sender_user_id === myId;
            return (
              <View key={m.id} style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <AppText variant="bodySm" style={{ color: mine ? colors.white : colors.ink[800] }}>
                    {m.body}
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{ color: mine ? "rgba(255,255,255,0.7)" : colors.ink[400], marginTop: 4 }}
                  >
                    {new Date(m.created_at).toLocaleString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                  </AppText>
                </View>
              </View>
            );
          })
        )}
      </Screen>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message…"
          placeholderTextColor={colors.ink[300]}
          multiline
          style={styles.input}
        />
        <View style={styles.sendBtn}>
          <Ionicons
            name="send"
            size={18}
            color={colors.ink[900]}
            onPress={() => void send()}
            style={{ padding: 6 }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  emptyWrap: { marginTop: 40 },
  bubbleRow: { flexDirection: "row", marginBottom: 10 },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: radius.md, padding: 12 },
  bubbleMine: { backgroundColor: colors.navy, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
    backgroundColor: colors.white,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.ink[50],
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 15,
    color: colors.ink[900],
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
});
