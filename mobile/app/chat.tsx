import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

type Msg = { id: string; role: string; content: string };

// Chat — thin client for the AI assistant (same backend as the web /chat).
// The web flow (threads + escalate) is mirrored here; escalation lands in M4.

export default function Chat() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

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
    <View style={styles.root}>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
            <Text style={item.role === "user" ? styles.textUser : styles.textBot}>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Ask Nuvora…"
          placeholderTextColor={colors.ink[400]}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => void send()}
        />
        <Pressable style={styles.send} onPress={() => void send()} disabled={!input.trim() || busy}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  bubble: { maxWidth: "82%", borderRadius: radius.lg, padding: 12 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: colors.navy, borderBottomRightRadius: 4 },
  bubbleBot: { alignSelf: "flex-start", backgroundColor: colors.goldLight, borderBottomLeftRadius: 4 },
  textUser: { color: colors.white, fontSize: 14 },
  textBot: { color: colors.ink[800], fontSize: 14 },
  composer: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: "#E8E4DA" },
  input: { flex: 1, borderWidth: 1, borderColor: "#E8E4DA", borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  send: { backgroundColor: colors.gold, borderRadius: radius.md, paddingHorizontal: 18, justifyContent: "center" },
  sendText: { color: colors.ink[900], fontWeight: "800" },
});
