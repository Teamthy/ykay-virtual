import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { colors, radius, spacing, type } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";
import { VideoPlayer } from "@/src/components/VideoPlayer";
import { cacheVideo, removeCachedVideo, isVideoCached } from "@/src/lib/offline-video";

// NUVORA course player — lessons (live + on-demand), resources, assignments.
// Premium UI kit + in-app expo-video playback for recorded lessons.

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  timezone: string;
  meeting_url?: string;
  video_url?: string;
  status: string;
};
type Resource = { id: string; title: string; description?: string; file_url?: string };
type Assignment = { id: string; title: string; instructions?: string; due_at?: string; max_score?: number };
type AttendanceRow = { student_profile_id: string; status: string };

export default function CourseDetail() {
  const { cohortId } = useLocalSearchParams<{ cohortId: string }>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [playing, setPlaying] = useState<Lesson | null>(null);
  const [offlineState, setOfflineState] = useState<Record<string, "idle" | "downloading" | "cached">>({});
  const [offlineChecked, setOfflineChecked] = useState(false);

  // On mount, check which of the loaded lessons are already cached offline.
  useEffect(() => {
    if (offlineChecked) return;
    let cancelled = false;
    (async () => {
      const map: Record<string, "idle" | "downloading" | "cached"> = {};
      for (const l of lessons) {
        map[l.id] = (await isVideoCached(l.id)) ? "cached" : "idle";
        if (cancelled) return;
      }
      if (!cancelled) setOfflineState(map);
      setOfflineChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessons, offlineChecked]);

  const toggleOffline = async (l: Lesson) => {
    if (!l.video_url) return;
    void Haptics.selectionAsync().catch(() => {});
    if (offlineState[l.id] === "cached") {
      await removeCachedVideo(l.id);
      setOfflineState((m) => ({ ...m, [l.id]: "idle" }));
      return;
    }
    setOfflineState((m) => ({ ...m, [l.id]: "downloading" }));
    const ok = await cacheVideo(l.id, l.video_url);
    setOfflineState((m) => ({ ...m, [l.id]: ok ? "cached" : "idle" }));
  };

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

  useEffect(() => void load(), [load]);

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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  const present = attendance.filter((a) => a.status === "PRESENT").length;

  if (loading) {
    return (
      <Screen scroll>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.skeleton, { opacity: 1 - i * 0.25 }]} />
        ))}
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="COURSE WORKSPACE"
        title="Course player"
        subtitle={
          attendance.length > 0
            ? `${present}/${attendance.length} lessons attended`
            : "Attendance appears once live classes are tracked"
        }
      />

      {playing?.video_url && (
        <Animated.View entering={FadeIn.duration(240)} style={styles.playerBlock}>
          <Card padded={false} style={styles.playerCard}>
            <VideoPlayer lessonId={playing.id} videoUrl={playing.video_url} />
            <View style={styles.playerMeta}>
              <AppText variant="h3">{playing.title}</AppText>
              <AppText variant="caption" style={{ marginTop: 2 }}>
                Now playing · recorded lesson
              </AppText>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Button
                  label={
                    offlineState[playing.id] === "cached"
                      ? "Remove offline copy"
                      : offlineState[playing.id] === "downloading"
                      ? "Downloading…"
                      : "Download for offline"
                  }
                  variant={offlineState[playing.id] === "cached" ? "secondary" : "dark"}
                  onPress={() => void toggleOffline(playing)}
                  disabled={offlineState[playing.id] === "downloading"}
                />
              </View>
            </View>
          </Card>
          <Button label="Close player" variant="ghost" style={{ marginTop: 8, alignSelf: "flex-start" }} onPress={() => setPlaying(null)} />
        </Animated.View>
      )}

      <Section title={`Lessons · ${lessons.length}`}>
        {lessons.map((l, i) => (
          <Animated.View key={l.id} entering={FadeIn.delay(i * 40).duration(240)}>
            <Card style={styles.row}>
              <View style={styles.rowTop}>
                <View style={styles.numBadge}>
                  <AppText style={{ color: colors.white, fontWeight: "800", fontSize: type.bodySm }}>
                    {i + 1}
                  </AppText>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="h3">{l.title}</AppText>
                  <AppText variant="caption" style={{ marginTop: 2 }}>
                    {new Date(l.start_at).toLocaleDateString()} ·{" "}
                    {new Date(l.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {l.timezone}
                  </AppText>
                </View>
              </View>

              <View style={styles.rowActions}>
                {l.video_url ? (
                  <Button
                    label={playing?.id === l.id ? "▶ Playing…" : "▶ Watch in app"}
                    variant="dark"
                    full
                    style={{ flex: 1 }}
                    onPress={() => setPlaying(l)}
                  />
                ) : l.meeting_url ? (
                  <Button
                    label="Join live"
                    variant="primary"
                    full
                    style={{ flex: 1 }}
                    onPress={() => void Linking.openURL(l.meeting_url as string)}
                  />
                ) : null}
                {l.status === "COMPLETED" && (
                  <View style={styles.donePill}>
                    <AppText variant="caption" style={styles.doneText}>
                      ✓ Done
                    </AppText>
                  </View>
                )}
              </View>
            </Card>
          </Animated.View>
        ))}
        {lessons.length === 0 && <Empty>No lessons scheduled yet.</Empty>}
      </Section>

      <Section title={`Resources · ${resources.length}`}>
        {resources.map((r) => (
          <Card key={r.id} style={styles.row} padded>
            <AppText style={{ fontSize: 18 }}>📄</AppText>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="h3">{r.title}</AppText>
              {r.description ? (
                <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 2 }}>
                  {r.description}
                </AppText>
              ) : null}
            </View>
          </Card>
        ))}
        {resources.length === 0 && <Empty>No resources yet.</Empty>}
      </Section>

      <Section title={`Assignments · ${assignments.length}`}>
        {assignments.map((a) => (
          <Card key={a.id} style={styles.row}>
            <AppText variant="h3">{a.title}</AppText>
            <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 4 }}>
              {a.instructions}
              {a.due_at ? ` · Due ${new Date(a.due_at).toLocaleDateString()}` : ""}
              {a.max_score ? ` · Max ${a.max_score}` : ""}
            </AppText>
            <View style={styles.assignRow}>
              <TextInput
                style={styles.input}
                placeholder="Paste your answer…"
                placeholderTextColor={colors.ink[400]}
                multiline
                value={drafts[a.id] ?? ""}
                onChangeText={(t) => setDrafts((d) => ({ ...d, [a.id]: t }))}
              />
              <Button
                label="Submit"
                variant="primary"
                disabled={submitting || !drafts[a.id]?.trim()}
                onPress={() => void submit(a.id)}
                style={styles.submitBtn}
              />
            </View>
          </Card>
        ))}
        {assignments.length === 0 && <Empty>No assignments yet.</Empty>}
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </AppText>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.emptyBox}>
      <AppText variant="bodySm" style={{ color: colors.ink[400], textAlign: "center" }}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { height: 96, borderRadius: radius.lg, backgroundColor: colors.ink[100], marginBottom: 12 },
  playerBlock: { marginBottom: 8 },
  playerCard: { overflow: "hidden" },
  playerMeta: { padding: 14 },
  section: { marginTop: 22 },
  sectionTitle: { color: colors.goldDark, letterSpacing: 1.1, marginBottom: 10, fontSize: type.caption },
  row: { padding: 16, flexDirection: "row", alignItems: "center" },
  rowTop: { flexDirection: "row", alignItems: "center", flex: 1 },
  numBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  donePill: {
    backgroundColor: colors.goldLight,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  doneText: { color: colors.goldDark, fontWeight: "700" },
  emptyBox: {
    padding: 20,
    borderRadius: radius.md,
    backgroundColor: colors.ink[50],
    borderWidth: 1,
    borderColor: colors.ink[100],
  },
  assignRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ink[100],
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: type.body,
    color: colors.ink[900],
    textAlignVertical: "top",
    minHeight: 84,
  },
  submitBtn: { alignSelf: "flex-start" },
});
