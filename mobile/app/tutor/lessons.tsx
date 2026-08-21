import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { spacing, type } from "@/src/lib/theme";
import { formatLessonTime, getTutorLessons, type TutorLesson } from "@/src/lib/tutor";

// Tutor lessons — every session assigned to this tutor, newest-first, split
// into upcoming and past. Dark-mode aware.

export default function TutorLessonsScreen() {
  const { colors } = useTheme();
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
});
