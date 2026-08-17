import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { formatLessonTime, getTutorLessons, type TutorLesson } from "@/src/lib/tutor";

// Tutor lessons — every session assigned to this tutor, newest-first, split
// into upcoming and past.

export default function TutorLessonsScreen() {
  const [lessons, setLessons] = useState<TutorLesson[]>([]);
  const [loading, setLoading] = useState(true);

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

  const renderLesson = (l: TutorLesson) => (
    <Card key={l.id} padded style={styles.row}>
      <View style={{ flex: 1 }}>
        <AppText variant="h3">{l.title}</AppText>
        <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
          {formatLessonTime(l.start_at)} · {l.status}
        </AppText>
      </View>
    </Card>
  );

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Lessons"
        title="Your sessions"
        subtitle="Every lesson assigned to you, upcoming first."
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
        upcoming.map(renderLesson)
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
        past.map(renderLesson)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.goldDark, letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  row: { marginBottom: 10 },
  emptyText: { color: colors.ink[500], textAlign: "center" },
});
