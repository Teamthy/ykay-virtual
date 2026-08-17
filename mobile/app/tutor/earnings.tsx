import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { formatNaira, getTutorEarnings, type TutorEarnings } from "@/src/lib/tutor";

// Tutor earnings — live escrow holds + payouts, the same data as the web
// tutor dashboard. Money stays fail-closed: nothing here initiates payouts.

export default function TutorEarningsScreen() {
  const [data, setData] = useState<TutorEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await getTutorEarnings());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const holds = data?.escrow_holds ?? [];
  const payouts = data?.payouts ?? [];

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Earnings"
        title="Your money, held safely"
        subtitle="Payments are held in escrow and released only after lessons are delivered."
      />

      <View style={styles.totals}>
        {[
          { label: "Held (escrow)", value: data?.held_total, color: colors.warning },
          { label: "Released", value: data?.released_total, color: colors.navy },
          { label: "Paid out", value: data?.paid_total, color: colors.success },
        ].map((t) => (
          <Card key={t.label} padded style={styles.totalCard}>
            <AppText variant="caption" style={{ color: colors.ink[400] }}>
              {t.label.toUpperCase()}
            </AppText>
            <AppText variant="h2" style={{ color: t.color, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>
              {loading ? "—" : formatNaira(t.value ?? 0)}
            </AppText>
          </Card>
        ))}
      </View>

      <AppText variant="label" style={styles.sectionTitle}>
        ESCROW HOLDS
      </AppText>
      {holds.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={styles.emptyText}>
            No escrow holds yet. When a learner pays, the fee is held here until lessons are delivered.
          </AppText>
        </Card>
      ) : (
        holds.map((h) => (
          <Card key={h.id} padded style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{formatNaira(h.amount)}</AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                {h.status} · held {new Date(h.held_at).toLocaleDateString("en-NG")}
              </AppText>
            </View>
            <AppText variant="label" style={{ color: h.released_at ? colors.success : colors.warning }}>
              {h.released_at ? "RELEASED" : "PENDING"}
            </AppText>
          </Card>
        ))
      )}

      <AppText variant="label" style={styles.sectionTitle}>
        PAYOUTS
      </AppText>
      {payouts.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={styles.emptyText}>
            No payouts yet — they appear after lessons are confirmed delivered.
          </AppText>
        </Card>
      ) : (
        payouts.map((p) => (
          <Card key={p.id} padded style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{formatNaira(p.amount)}</AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                {p.status} · {p.currency}
              </AppText>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  totals: { gap: 10 },
  totalCard: {},
  sectionTitle: { color: colors.goldDark, letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  emptyText: { color: colors.ink[500], textAlign: "center" },
});
