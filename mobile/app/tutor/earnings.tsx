import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing, type } from "@/src/lib/theme";
import { formatNaira, getTutorEarnings, type TutorEarnings } from "@/src/lib/tutor";

// Tutor earnings — the money command center: AVAILABLE BALANCE is the dominant
// fact (released escrow you can withdraw), held/paid-out as supporting stats,
// then the escrow holds and payouts ledger. Money stays fail-closed: nothing
// here initiates payouts. Dark-mode aware.

export default function TutorEarningsScreen() {
  const { colors } = useTheme();
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

  if (loading) {
    return (
      <Screen scroll>
        <Skeleton height={150} />
        <View style={styles.totals}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={76} style={{ flex: 1 }} />
          ))}
        </View>
        <Skeleton height={72} style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Earnings"
        title="Your money, held safely"
        subtitle="Payments are held in escrow and released only after lessons are delivered."
      />

      {/* Escrow status — three equal cards, no dominant money figure */}
      <AppText variant="label" style={{ color: colors.ink[500], letterSpacing: 1.1, fontSize: type.caption, marginBottom: spacing.sm }}>
        ESCROW STATUS
      </AppText>
      <Animated.View entering={FadeIn.delay(80).duration(240)} style={styles.totals}>
        {[
          { label: "HELD (ESCROW)", value: data?.held_total, color: colors.warning },
          { label: "RELEASED", value: data?.released_total, color: colors.greenDark },
          { label: "PAID OUT", value: data?.paid_total, color: colors.deepLight },
        ].map((t) => (
          <Card key={t.label} padded style={styles.totalCard}>
            <AppText variant="caption" style={{ color: colors.ink[400] }}>
              {t.label}
            </AppText>
            <AppText variant="h2" style={{ color: t.color, marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>
              {formatNaira(t.value ?? 0)}
            </AppText>
          </Card>
        ))}
      </Animated.View>

      <AppText variant="label" style={{ color: colors.ink[500], letterSpacing: 1.1, fontSize: type.caption, marginTop: spacing.xl, marginBottom: spacing.sm }}>
        ESCROW HOLDS
      </AppText>
      {holds.length === 0 ? (
        <EmptyState
          icon="lock-closed-outline"
          title="No escrow holds yet"
          description="When a learner pays, the fee is held here until lessons are delivered."
        />
      ) : (
        holds.map((h) => (
          <Card key={h.id} padded style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{formatNaira(h.amount)}</AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                {h.status} · held {new Date(h.held_at).toLocaleDateString("en-NG")}
              </AppText>
            </View>
            <View style={[styles.chip, { backgroundColor: h.released_at ? colors.greenLight : colors.ink[100] }]}>
              <AppText variant="caption" style={{ color: h.released_at ? colors.greenDark : colors.warning, fontWeight: "800" }}>
                {h.released_at ? "RELEASED" : "PENDING"}
              </AppText>
            </View>
          </Card>
        ))
      )}

      <AppText variant="label" style={{ color: colors.ink[500], letterSpacing: 1.1, fontSize: type.caption, marginTop: spacing.xl, marginBottom: spacing.sm }}>
        PAYOUTS
      </AppText>
      {payouts.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="No payouts yet"
          description="They appear after lessons are confirmed delivered and the escrow releases."
        />
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
  totals: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  totalCard: { flexGrow: 1, flexBasis: "46%", maxWidth: "48.5%" },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  chip: { paddingHorizontal: spacing.xs, paddingVertical: 3, borderRadius: radius.pill },
});
