import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing, type } from "@/src/lib/theme";
import {
  cancelTutorLesson,
  formatLessonTime,
  getTutorLessons,
  rescheduleTutorLesson,
  type TutorLesson,
} from "@/src/lib/tutor";

// Tutor lessons — every session assigned to this tutor, newest-first, split
// into upcoming and past. Dark-mode aware.

export default function TutorLessonsScreen() {
  const { colors } = useTheme();
  const [lessons, setLessons] = useState<TutorLesson[]>([]);
  const [loading, setLoading] = useState(true);
  // FR-23 self-service scheduling.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const toLocalInput = (iso: string) => iso.slice(0, 16); // YYYY-MM-DDTHH:mm

  // "YYYY-MM-DDTHH:mm" parsed as the device's LOCAL wall time (mirrors the
  // web's datetime-local behaviour), then sent to the API as UTC.
  const parseDraft = (v: string) => {
    const t = Date.parse(v.length === 16 ? `${v}:00` : v);
    return Number.isNaN(t) ? null : new Date(t);
  };

  const move = async (l: TutorLesson) => {
    const start = parseDraft(draftStart);
    const end = parseDraft(draftEnd);
    if (!start || !end) {
      Alert.alert("Check the times", "Use the format 2026-09-01T15:30 for both start and end.");
      return;
    }
    if (end <= start) {
      Alert.alert("Check the times", "The end time must be after the start time.");
      return;
    }
    setBusy(true);
    try {
      await rescheduleTutorLesson(l.id, start.toISOString(), end.toISOString());
      setEditingId(null);
      await load();
    } catch (e) {
      Alert.alert("Could not reschedule", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = (l: TutorLesson) =>
    Alert.alert(
      "Cancel this lesson?",
      `Learners will see "${l.title}" as cancelled, and the slot frees up on your calendar.`,
      [
        { text: "Keep lesson", style: "cancel" },
        {
          text: "Cancel lesson",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await cancelTutorLesson(l.id);
              await load();
            } catch (e) {
              Alert.alert("Could not cancel", e instanceof Error ? e.message : "Please try again.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );

  const load = useCallback(async () => {
    try {
      setLessons(await getTutorLessons());
    } catch {
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up = lessons
      .filter((l) => new Date(l.start_at).getTime() >= now)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    const p = lessons
      .filter((l) => new Date(l.start_at).getTime() < now)
      .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
    return { upcoming: up, past: p };
  }, [lessons]);

  if (loading) {
    return (
      <Screen scroll>
        <Skeleton height={72} />
        <Skeleton height={72} style={{ marginTop: spacing.sm }} />
        <Skeleton height={72} style={{ marginTop: spacing.sm }} />
      </Screen>
    );
  }

  const renderLesson = (l: TutorLesson) => (
    <Card key={l.id} padded style={styles.row}>
      <View style={{ flex: 1 }}>
        <View style={styles.rowTop}>
          <AppText variant="h3" style={{ flex: 1 }}>
            {l.title}
          </AppText>
          {l.meeting_url ? (
            <View style={[styles.chip, { backgroundColor: colors.greenLight }]}>
              <AppText variant="caption" style={{ color: colors.greenDark, fontWeight: "800" }}>
                LIVE
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
          {formatLessonTime(l.start_at)} · {l.status}
        </AppText>
        {new Date(l.start_at).getTime() >= Date.now() && l.status !== "CANCELLED" ? (
          <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm }}>
            <TouchableOpacity
              disabled={busy}
              onPress={() => {
                setEditingId(editingId === l.id ? null : l.id);
                setDraftStart(toLocalInput(l.start_at));
                setDraftEnd(toLocalInput(l.end_at));
              }}
              style={[styles.actionBtn, { borderColor: colors.border }]}
            >
              <AppText variant="caption" style={{ color: colors.ink[700], fontWeight: "700" }}>
                {editingId === l.id ? "Close" : "Reschedule"}
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={busy}
              onPress={() => cancel(l)}
              style={[styles.actionBtn, { borderColor: colors.danger + "55" }]}
            >
              <AppText variant="caption" style={{ color: colors.danger, fontWeight: "700" }}>
                Cancel
              </AppText>
            </TouchableOpacity>
          </View>
        ) : null}
        {editingId === l.id ? (
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            <Text style={{ fontSize: type.caption, color: colors.ink[500] }}>
              New start / end (format 2026-09-01T15:30)
            </Text>
            <TextInput
              value={draftStart}
              onChangeText={setDraftStart}
              autoCorrect={false}
              placeholder="2026-09-01T15:30"
              placeholderTextColor={colors.ink[300]}
              style={[styles.input, { borderColor: colors.border, color: colors.ink[800] }]}
            />
            <TextInput
              value={draftEnd}
              onChangeText={setDraftEnd}
              autoCorrect={false}
              placeholder="2026-09-01T16:30"
              placeholderTextColor={colors.ink[300]}
              style={[styles.input, { borderColor: colors.border, color: colors.ink[800] }]}
            />
            <TouchableOpacity
              disabled={busy}
              onPress={() => void move(l)}
              style={[styles.applyBtn, { backgroundColor: colors.deep, opacity: busy ? 0.5 : 1 }]}
            >
              <AppText variant="caption" style={{ color: colors.green, fontWeight: "800" }}>
                {busy ? "Saving…" : "Confirm new time"}
              </AppText>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Card>
  );

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="My lessons"
        title="Lessons"
        subtitle="Every session assigned to you, upcoming first."
      />

      <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
        UPCOMING
      </AppText>
      {upcoming.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No upcoming lessons"
          description="Keep your availability current so parents can book you into new slots."
        />
      ) : (
        upcoming.map(renderLesson)
      )}

      <AppText variant="label" style={[styles.section, { color: colors.ink[500] }]}>
        PAST
      </AppText>
      {past.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No past lessons yet.
          </AppText>
        </Card>
      ) : (
        past.map(renderLesson)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { letterSpacing: 1.1, fontSize: type.caption, marginTop: spacing.xl, marginBottom: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  chip: { paddingHorizontal: spacing.xs, paddingVertical: 3, borderRadius: 999 },
  actionBtn: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2, // ≥44pt row targets with text baseline
    alignItems: "center",
  },
  input: {
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    fontSize: type.bodySm,
  },
  applyBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
});
