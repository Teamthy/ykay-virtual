import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import { SITE_URL } from "@/src/lib/api";
import { formatNaira, getCohort, type CohortDetail } from "@/src/lib/catalogue";

// Cohort detail — a published cohort (GET /cohorts/{id}): schedule, capacity,
// fee and status. Enrolment happens through the booking flow.

export default function CohortDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setCohort(await getCohort(id));
    } catch {
      setCohort(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => void load(), [load]));

  if (loading) {
    return (
      <Screen scroll>
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 48 }}>
          Loading cohort…
        </AppText>
      </Screen>
    );
  }

  if (!cohort) {
    return (
      <Screen scroll>
        <AppText variant="h2" style={{ marginTop: 32 }}>Cohort not found</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 8 }}>
          This cohort may no longer be available.
        </AppText>
      </Screen>
    );
  }

  const seatsLeft = Math.max(0, cohort.capacity - cohort.enrolled_count);

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <AppText variant="label" style={{ color: colors.goldDark }}>{cohort.status.toUpperCase()}</AppText>
        <AppText variant="h1" style={{ color: colors.white, marginTop: 6 }}>{cohort.title}</AppText>
        {cohort.schedule_description ? (
          <AppText variant="bodySm" style={{ color: "rgba(255,255,255,0.85)", marginTop: 8, lineHeight: 20 }}>
            {cohort.schedule_description}
          </AppText>
        ) : null}
      </View>

      <Card padded style={{ marginTop: 16 }}>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <AppText variant="h2" style={{ color: colors.navy }}>{cohort.capacity}</AppText>
            <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>CAPACITY</AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="h2" style={{ color: colors.navy }}>{cohort.enrolled_count}</AppText>
            <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>ENROLLED</AppText>
          </View>
          <View style={styles.stat}>
            <AppText variant="h2" style={{ color: seatsLeft > 0 ? colors.deep : colors.danger }}>{seatsLeft}</AppText>
            <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>SEATS LEFT</AppText>
          </View>
        </View>
      </Card>

      <Card padded style={{ marginTop: 12 }}>
        <AppText variant="h3">Schedule</AppText>
        <View style={{ marginTop: 10, gap: 8 }}>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={16} color={colors.navy} />
            <AppText variant="bodySm" style={{ color: colors.ink[700], marginLeft: 10 }}>
              {new Date(cohort.start_date).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
              {" – "}
              {new Date(cohort.end_date).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
            </AppText>
          </View>
          <View style={styles.row}>
            <Ionicons name="time-outline" size={16} color={colors.navy} />
            <AppText variant="bodySm" style={{ color: colors.ink[700], marginLeft: 10 }}>
              {cohort.timezone}
            </AppText>
          </View>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={16} color={colors.navy} />
            <AppText variant="bodySm" style={{ color: colors.ink[700], marginLeft: 10 }}>
              {cohort.location_mode === "ONLINE" ? "Online" : cohort.location_mode}
            </AppText>
          </View>
        </View>
      </Card>

      <Card padded style={{ marginTop: 12 }}>
        <AppText variant="h3">Fee</AppText>
        <AppText variant="h2" style={{ color: colors.deep, marginTop: 6 }}>{formatNaira(cohort.fee)}</AppText>
        <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
          {cohort.currency} · escrow-protected until lessons are delivered
        </AppText>
      </Card>

      {/* Commerce deep-link (parity fix): enrolment runs on the web checkout —
          escrow, coupons and gateway return all live there. One tap opens the
          browser at this cohort's enrolment page; no dead end in the app. */}
      <View style={{ marginTop: 16, paddingHorizontal: 4 }}>
        <Button
          label={seatsLeft > 0 ? "Enrol on web — pay securely" : "Join the waiting list on web"}
          full
          icon={<Ionicons name="open-outline" size={16} color={colors.navy} />}
          onPress={() => void Linking.openURL(`${SITE_URL}/cohorts/${cohort.id}/enroll`)}
        />
        <AppText variant="caption" style={{ color: colors.ink[400], textAlign: "center", marginTop: 10 }}>
          Secure checkout with escrow protection opens in your browser. Your sign-in works there too.
        </AppText>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  hero: { backgroundColor: colors.navy, borderRadius: 20, padding: 24 },
  statRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center" },
});
