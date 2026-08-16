import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "@/src/components/ui/AppText";
import { Button } from "@/src/components/ui/Button";
import { colors, radius, type } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Chat — premium AI-assistant client (same backend as the web /chat).

type Msg = { id: string; role: string; content: string };

export default function Chat() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    if (threadId) return;
    apiFetch<{ id: string }>("/chat/threads", { method: "POST", body: JSON.stringify({}) })
      .then((r) => setThreadId(r.data.id))
      .catch(() => undefined);
  }, [threadId]);

  const send = async () => {
    const text = input.trim();
    if (!text || !threadId || busy) return;
    setInput("");
    setBusy(true);
    void Haptics.selectionAsync().catch(() => {});
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: text }]);
    try {
      const res = await apiFetch<{ reply: string }>(`/chat/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: res.data.reply }]);
    } catch {
      setMessages((m) => [...m, { id: `e-${Date.now()}`, role: "system", content: "Could not reach the assistant — try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <AppText style={{ fontSize: 20 }}>💬</AppText>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="h3">Chat with Nuvora</AppText>
          <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
            AI assistant · answers in seconds
          </AppText>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText style={{ fontSize: 36 }}>👋</AppText>
            <AppText variant="h3" style={{ marginTop: 10 }}>
              Ask me anything
            </AppText>
            <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 6, lineHeight: 19 }}>
              "What's my next lesson?" · "Explain simultaneous equations" · "Help me revise for UTME"
            </AppText>
          </View>
        }
        renderItem={({ item }) =>
          item.role === "system" ? (
            <View style={[styles.bubble, styles.bubbleSystem]}>
              <AppText variant="bodySm" style={{ color: colors.danger, textAlign: "center" }}>
                {item.content}
              </AppText>
            </View>
          ) : (
            <View style={[styles.bubble, item.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
              <AppText variant="body" style={item.role === "user" ? styles.textUser : styles.textBot}>
                {item.content}
              </AppText>
            </View>
          )
        }
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Ask Nuvora…"
          placeholderTextColor={colors.ink[400]}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => void send()}
          returnKeyType="send"
        />
        <Button label="Send" disabled={!input.trim() || busy} loading={busy} onPress={() => void send()} style={styles.send} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink[100],
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  empty: { alignItems: "center", paddingTop: 48 },
  bubble: { maxWidth: "82%", borderRadius: radius.lg, padding: 12 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.navy, borderBottomRightRadius: 4 },
  bubbleBot: { alignSelf: "flex-start", backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  bubbleSystem: { alignSelf: "center", backgroundColor: colors.ink[50] },
  textUser: { color: colors.white },
  textBot: { color: colors.ink[800] },
  composer: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.ink[100],
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: type.body,
    color: colors.ink[900],
  },
  send: { paddingVertical: 12, paddingHorizontal: 18 },
});
