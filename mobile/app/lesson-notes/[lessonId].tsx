import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Lesson notes — the tutor's notes and homework for one lesson
// (GET /lessons/{lessonId}/notes). Only notes visible to you are returned.

type LessonNote = {
  id: string;
  lesson_id: string;
  tutor_profile_id: string;
  student_profile_id?: string | null;
  content: string;
  homework?: string | null;
  is_visible_to_parent: boolean;
  created_at: string;
};

export default function LessonNotesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<LessonNote[]>(`/lessons/${lessonId}/notes`);
      setNotes(res.data ?? []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useFocusEffect(useCallback(() => void load(), [load]));

  return (
    <Screen scroll>
      <Card padded style={styles.headerCard}>
        <Ionicons name="document-text-outline" size={22} color={colors.navy} />
        <AppText variant="h2" style={{ marginTop: 8 }}>Lesson notes</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 4 }}>
          Notes and homework your tutor shared for this lesson.
        </AppText>
      </Card>

      {loading ? (
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 24 }}>
          Loading notes…
        </AppText>
      ) : notes.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No notes for this lesson yet. Your tutor adds them after the session.
          </AppText>
        </Card>
      ) : (
        notes.map((n) => (
          <Card key={n.id} padded style={styles.noteCard}>
            <AppText variant="bodySm" style={{ color: colors.ink[700], lineHeight: 20 }}>{n.content}</AppText>

            {n.homework ? (
              <View style={styles.homeworkBox}>
                <Ionicons name="home-outline" size={16} color={colors.navy} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <AppText variant="label">HOMEWORK</AppText>
                  <AppText variant="bodySm" style={{ color: colors.ink[700], marginTop: 2, lineHeight: 19 }}>
                    {n.homework}
                  </AppText>
                </View>
              </View>
            ) : null}

            <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 10 }}>
              {new Date(n.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              {n.is_visible_to_parent ? " · visible to parents" : ""}
            </AppText>
          </Card>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  headerCard: {},
  noteCard: { marginTop: 12 },
  homeworkBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.goldLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
});
