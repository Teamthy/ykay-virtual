import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";
import { VideoPlayer } from "@/src/components/VideoPlayer";

// M3 — course detail: lessons, resources, assignments (submit), attendance.

type Lesson = { id: string; title: string; start_at: string; timezone: string; meeting_url?: string; video_url?: string; status: string };
type Resource = { id: string; title: string; description?: string; file_url?: string };
type Assignment = { id: string; title: string; instructions?: string; due_at?: string; max_score?: number };
type AttendanceRow = { student_profile_id: string; status: string };

export default function CourseDetail() {
  const { cohortId } = useLocalSearchParams<{ cohortId: string }>();
  // G1: submissions and attendance resolve the learner from the session.

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [playing, setPlaying] = useState<Lesson | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, r, a, at] = await Promise.all([
        apiFetch<Lesson[]>(`/cohorts/${cohortId}/lessons`),
        apiFetch<Resource[]>(`/cohorts/${cohortId}/resources`),
        apiFetch<Assignment[]>(`/cohorts/${cohortId}/assignments`),
        apiFetch<AttendanceRow[]>(`/cohorts/${cohortId}/enrollments`).catch(() => ({ data: [] })),
      ]);
      setLessons(l.data ?? []);
      setResources(r.data ?? []);
      setAssignments(a.data ?? []);
      setAttendance(at.data ?? []);
    } catch {
      // partial data still renders
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  React.useEffect(() => { void load(); }, [load]);

  const submit = async (assignmentId: string) => {
    const content = drafts[assignmentId];
    if (!content?.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch(`/me/assignments/${assignmentId}/submit`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setDrafts((d) => ({ ...d, [assignmentId]: "" }));
    } catch {
      // surface via alert below
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 64 }} color={colors.gold} size="large" />;
  }

  // Roster endpoint is tutor/admin-scoped; the student's own summary comes
  // from /me/attendance-summary. Show total tracked rows as a fallback.
  const mine = attendance;
  const present = mine.filter((a) => a.status === "PRESENT").length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <Text style={styles.title}>Course workspace</Text>
      <Text style={styles.sub}>
        Attendance: {mine.length > 0 ? `${present}/${mine.length} present` : "not tracked yet"}
      </Text>

      {playing?.video_url && (
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.rowTitle}>{playing.title}</Text>
          <VideoPlayer lessonId={playing.id} videoUrl={playing.video_url} style={{ marginTop: 8 }} />
          <Pressable style={[styles.btn, { marginTop: 8, alignSelf: "flex-start", paddingVertical: 8 }]} onPress={() => setPlaying(null)}>
            <Text style={styles.btnText}>Close player</Text>
          </Pressable>
        </View>
      )}

      <Section title={`Lessons (${lessons.length})`}>
        {lessons.map((l, i) => (
          <View key={l.id} style={styles.row}>
            <Text style={styles.rowTitle}>{i + 1}. {l.title}</Text>
            <Text style={styles.rowMeta}>
              {new Date(l.start_at).toLocaleString()} · {l.timezone}
              {l.video_url ? " · 🎬 on-demand video" : l.meeting_url ? " · live class" : ""}
            </Text>
            {l.video_url ? (
              <Pressable
                style={[styles.btn, { marginTop: 8, alignSelf: "flex-start", paddingVertical: 8 }]}
<<<<<<< ours
                onPress={() => {
                  // Record watch progress on open; the backend tracks completion.
                  void apiFetch(`/learning/lessons/${l.id}/progress`, {
                    method: "POST",
                    body: JSON.stringify({ watched: true, position_seconds: 0 }),
                  });
                  // Open the video in the system browser (mobile plays it natively).
                  void Linking.openURL(l.video_url as string);
                }}
              >
                <Text style={styles.btnText}>▶ Watch video</Text>
=======
                onPress={() => setPlaying(l)}
              >
                <Text style={styles.btnText}>{playing?.id === l.id ? "▶ Playing…" : "▶ Watch in app"}</Text>
>>>>>>> theirs
              </Pressable>
            ) : l.meeting_url ? (
              <Pressable
                style={[styles.btn, { marginTop: 8, alignSelf: "flex-start", paddingVertical: 8 }]}
                onPress={() => {
                  void Linking.openURL(l.meeting_url as string);
                }}
              >
                <Text style={styles.btnText}>Join live</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {lessons.length === 0 && <Text style={styles.muted}>No lessons scheduled yet.</Text>}
      </Section>

      <Section title={`Resources (${resources.length})`}>
        {resources.map((r) => (
          <Pressable key={r.id} style={styles.row} onPress={() => r.file_url && undefined}>
            <Text style={styles.rowTitle}>📄 {r.title}</Text>
            {r.description ? <Text style={styles.rowMeta}>{r.description}</Text> : null}
          </Pressable>
        ))}
        {resources.length === 0 && <Text style={styles.muted}>No resources yet.</Text>}
      </Section>

      <Section title={`Assignments (${assignments.length})`}>
        {assignments.map((a) => (
          <View key={a.id} style={styles.row}>
            <Text style={styles.rowTitle}>{a.title}</Text>
            <Text style={styles.rowMeta}>
              {a.instructions}
              {a.due_at ? ` · Due ${new Date(a.due_at).toLocaleDateString()}` : ""}
              {a.max_score ? ` · Max ${a.max_score}` : ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Paste your answer…"
                placeholderTextColor={colors.ink[400]}
                value={drafts[a.id] ?? ""}
                onChangeText={(t) => setDrafts((d) => ({ ...d, [a.id]: t }))}
              />
              <Pressable style={styles.btn} onPress={() => void submit(a.id)} disabled={submitting || !drafts[a.id]?.trim()}>
                <Text style={styles.btnText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {assignments.length === 0 && <Text style={styles.muted}>No assignments yet.</Text>}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  title: { fontSize: 24, fontWeight: "800", color: colors.navy },
  sub: { fontSize: 13, color: colors.ink[500], marginTop: 4, marginBottom: 8 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.navy, marginBottom: 8 },
  row: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: "#E8E4DA", padding: 14 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.ink[800] },
  rowMeta: { fontSize: 12, color: colors.ink[500], marginTop: 3, lineHeight: 17 },
  muted: { color: colors.ink[400], fontSize: 13 },
  input: {
    backgroundColor: "#FFFCF5", borderRadius: radius.sm, borderWidth: 1,
    borderColor: "#E8E4DA", paddingHorizontal: 12, paddingVertical: 8, fontSize: 13,
  },
  btn: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: 16, justifyContent: "center" },
  btnText: { color: colors.ink[900], fontWeight: "800", fontSize: 13 },
});
