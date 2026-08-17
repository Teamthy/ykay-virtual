import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { formatLessonTime, getTutorLessons, type TutorLesson } from "@/src/lib/tutor";

// Tutor schedule — the next 7 days of teaching grouped by day, with a shortcut
// to set availability.

export default function TutorScheduleScreen() {
  const [lessons, setLessons] = useState<TutorLesson[]>([]);

  const load = useCallback(async () => {
    try {
      setLessons(await getTutorLessons());
    } catch {
      setLessons([]);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const byDay = useMemo(() => {
    const now = Date.now();
    const horizon = now + 7 * 24 * 60 * 60 * 1000;
    const inWindow = lessons
      .filter((l) => {
        const t = new Date(l.start_at).getTime();
        return t >= now && t <= horizon;
      })
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

    const map = new Map<string, TutorLesson[]>();
    for (const l of inWindow) {
      const key = new Date(l.start_at).toLocaleDateString("en-NG", {
        weekday: "long",
        day: "numeric",
        month: "short",
      });
      const arr = map.get(key) ?? [];
      arr.push(l);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [lessons]);

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Schedule"
        title="Your next 7 days"
        subtitle="Everything you're teaching this week, grouped by day."
      />

      {byDay.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            Nothing scheduled in the next 7 days. Once lessons are booked they'll show here.
          </AppText>
        </Card>
      ) : (
        byDay.map(([day, items]) => (
          <View key={day} style={styles.dayBlock}>
            <AppText variant="label" style={styles.dayTitle}>
              {day.toUpperCase()}
            </AppText>
            {items.map((l) => (
              <Card key={l.id} padded style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h3">{l.title}</AppText>
                  <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                    {formatLessonTime(l.start_at)}
                  </AppText>
                </View>
              </Card>
            ))}
          </View>
        ))
      )}

      <Card onPress={() => router.push("/tutor/availability" as never)} padded style={styles.availabilityCta}>
        <Ionicons name="time-outline" size={20} color={colors.navy} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="h3">Set your availability</AppText>
          <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
            Control the hours learners can book you.
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.goldDark} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayBlock: { marginBottom: 8 },
  dayTitle: { color: colors.goldDark, letterSpacing: 1.1, fontSize: 12, marginBottom: 8, marginTop: 8 },
  row: { marginBottom: 8 },
  availabilityCta: { flexDirection: "row", alignItems: "center", marginTop: 20 },
});
