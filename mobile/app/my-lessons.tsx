import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// My lessons — every session assigned to this learner (GET /me/lessons), split
// into upcoming and past, with a shortcut to each lesson's notes.

type Lesson = {
  id: string;
  cohort_id?: string | null;
  title: string;
  start_at: string;
  end_at?: string | null;
  status: string;
  meeting_url?: string | null;
  video_url?: string | null;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyLessonsScreen() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Lesson[]>("/me/lessons");
      setLessons(res.data ?? []);
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

  const render = (l: Lesson) => (
    <Card key={l.id} padded style={styles.row}>
      <View style={{ flex: 1 }}>
        <AppText variant="h3">{l.title}</AppText>
        <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
          {formatTime(l.start_at)} · {l.status}
        </AppText>
        {(l.meeting_url || l.video_url) && (
          <View style={styles.metaRow}>
            {l.video_url ? <Ionicons name="play-circle-outline" size={14} color={colors.navy} /> : null}
            {l.meeting_url ? <Ionicons name="videocam-outline" size={14} color={colors.navy} /> : null}
            <AppText variant="caption" style={{ color: colors.ink[500], marginLeft: 4 }}>
              {l.video_url ? "Recording available" : ""}
              {l.video_url && l.meeting_url ? " · " : ""}
              {l.meeting_url ? "Live link" : ""}
            </AppText>
          </View>
        )}
      </View>
      <Ionicons
        name="document-text-outline"
        size={18}
        color={colors.goldDark}
        onPress={() => router.push(`/lesson-notes/${l.id}` as never)}
      />
    </Card>
  );

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="My learning"
        title="My lessons"
        subtitle="Every session assigned to you, upcoming first."
      />

      <AppText variant="label" style={styles.sectionTitle}>
        UPCOMING
      </AppText>
      {upcoming.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={styles.emptyText}>
            {loading ? "Loading…" : "No upcoming lessons."}
          </AppText>
        </Card>
      ) : (
        upcoming.map(render)
      )}

      <AppText variant="label" style={styles.sectionTitle}>
        PAST
      </AppText>
      {past.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={styles.emptyText}>
            No past lessons yet.
          </AppText>
        </Card>
      ) : (
        past.map(render)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.goldDark, letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
  emptyText: { color: colors.ink[500], textAlign: "center" },
});
