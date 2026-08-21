import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import {
  addAvailability,
  DAY_NAMES,
  deleteAvailability,
  getAvailability,
  type AvailabilitySlot,
} from "@/src/lib/tutor";

// Tutor availability — weekly teaching hours. Slots are recurring weekly
// windows; add and remove them here.

export default function TutorAvailabilityScreen() {
  const { colors } = useTheme();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [day, setDay] = useState(1); // Monday
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSlots(await getAvailability());
    } catch {
      setSlots([]);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await addAvailability({ day_of_week: day, start_time: start, end_time: end, is_recurring: true });
      await load();
    } catch {
      // validation errors surface via the UI state
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteAvailability(id);
      await load();
    } catch {
      // ignore — reload reflects the truth
    }
  };

  const grouped = DAY_NAMES.map((name, idx) => ({
    name,
    idx,
    slots: slots.filter((s) => s.day_of_week === idx),
  })).filter((g) => g.slots.length > 0);

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Availability"
        title="Your teaching hours"
        subtitle="Recurring weekly windows. Learners can only book inside them."
      />

      <Card padded style={styles.form}>
        <AppText variant="label">DAY</AppText>
        <View style={styles.dayRow}>
          {DAY_NAMES.slice(1, 6).map((name, i) => {
            const idx = i + 1; // Mon–Fri
            const active = day === idx;
            return (
              <Card
                key={name}
                onPress={() => setDay(idx)}
                padded
                style={active ? { ...styles.dayChip, backgroundColor: colors.green } : styles.dayChip}
              >
                <AppText variant="caption" style={{ color: active ? colors.ink[950] : colors.ink[600], fontWeight: "700" }}>
                  {name.slice(0, 3)}
                </AppText>
              </Card>
            );
          })}
        </View>

        <View style={styles.timeRow}>
          <View style={{ flex: 1 }}>
            <AppInput label="Start (24h)" value={start} onChangeText={setStart} placeholder="09:00" />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput label="End (24h)" value={end} onChangeText={setEnd} placeholder="17:00" />
          </View>
        </View>

        <Button label="Add window" loading={busy} full onPress={() => void add()} />
      </Card>

      <AppText variant="label" style={[styles.sectionTitle, { color: colors.ink[500] }]}>
        CURRENT WINDOWS
      </AppText>
      {grouped.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No availability set yet — add a window above so learners can book you.
          </AppText>
        </Card>
      ) : (
        grouped.map((g) => (
          <View key={g.name} style={styles.dayBlock}>
            <AppText variant="label" style={[styles.dayLabel, { color: colors.ink[500] }]}>
              {g.name.toUpperCase()}
            </AppText>
            {g.slots.map((s) => (
              <Card key={s.id} padded style={styles.slotRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h3">
                    {s.start_time} – {s.end_time}
                  </AppText>
                  <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                    {s.is_recurring ? "Repeats weekly" : "One-off"}
                  </AppText>
                </View>
                <Ionicons name="trash-outline" size={18} color={colors.danger} onPress={() => void remove(s.id)} />
              </Card>
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {},
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  dayChip: { paddingVertical: 8, paddingHorizontal: 10 },
  timeRow: { flexDirection: "row", gap: 10 },
  sectionTitle: { letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  dayBlock: { marginBottom: 8 },
  dayLabel: { letterSpacing: 1, fontSize: 11, marginBottom: 6, marginTop: 8 },
  slotRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
});
