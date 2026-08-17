import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { getMyLessonProgress, type LessonProgress } from "@/src/lib/api";
import { apiFetch } from "@/src/lib/api";

// Learning progress — your per-lesson watch state (GET /me/learning/progress),
// joined with lesson titles from /me/lessons.

type Lesson = { id: string; title: string };

export default function LearningProgressScreen() {
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, l] = await Promise.all([
        getMyLessonProgress().catch(() => [] as LessonProgress[]),
        apiFetch<Lesson[]>("/me/lessons")
          .then((r) => r.data ?? [])
          .catch(() => [] as Lesson[]),
      ]);
      setProgress(p);
      setLessons(l);
    } catch {
      setProgress([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of lessons) m.set(l.id, l.title);
    return m;
  }, [lessons]);

  const watched = progress.filter((p) => p.watched).length;

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="My learning"
        title="Lesson progress"
        subtitle={`${watched} of ${progress.length} lessons watched.`}
      />

      {loading ? (
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 24 }}>
          Loading progress…
        </AppText>
      ) : progress.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No lesson progress yet. Watch a lesson recording and your progress appears here.
          </AppText>
        </Card>
      ) : (
        progress.map((p) => {
          const done = p.watched;
          const title = titleById.get(p.lesson_id) ?? "Lesson";
          const mins = Math.max(0, Math.round((p.position_seconds ?? 0) / 60));
          return (
            <Card key={`${p.lesson_id}-${p.id ?? "p"}`} padded style={styles.row}>
              <View style={[styles.dot, done && styles.dotDone]}>
                <Ionicons name={done ? "checkmark" : "play"} size={14} color={done ? colors.white : colors.navy} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="h3" numberOfLines={1}>{title}</AppText>
                <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                  {done ? "Watched" : `Paused at ${mins} min`}
                </AppText>
              </View>
              <Ionicons
                name={done ? "checkmark-circle" : "time-outline"}
                size={18}
                color={done ? colors.success : colors.ink[300]}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: colors.success },
});
