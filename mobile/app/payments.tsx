import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing, type } from "@/src/lib/theme";
import { formatNaira, listOrders, type Order } from "@/src/lib/account";

// Payments — the parent/learner billing command center: TOTAL SPENT is the
// dominant fact, with paid/pending split, then the order history. Read-only:
// nothing here initiates payments or refunds. Dark-mode aware.

export default function PaymentsScreen() {
  const { colors } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const o = await listOrders();
      setOrders(o.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const paid = useMemo(() => orders.filter((o) => o.status === "PAID"), [orders]);
  const totalSpent = paid.reduce((n, o) => n + o.total_amount, 0);

  if (loading) {
    return (
      <Screen scroll>
        <Skeleton height={140} />
        <Skeleton height={72} style={{ marginTop: spacing.lg }} />
        <Skeleton height={72} style={{ marginTop: spacing.sm }} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Billing"
        title="Payments"
        subtitle="Your orders and payment history."
      />

      {/* B. Primary card — total spent is the dominant fact */}
      <Animated.View entering={FadeIn.delay(60).duration(240)}>
        <LinearGradient colors={[colors.navy, colors.navyDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <AppText variant="label" style={styles.heroEyebrow}>
            TOTAL SPENT
          </AppText>
          <AppText variant="display" style={styles.heroAmount}>
            {formatNaira(totalSpent)}
          </AppText>
          <View style={styles.heroSubRow}>
            <AppText style={styles.heroCap}>{paid.length} paid order{paid.length === 1 ? "" : "s"}</AppText>
            <View style={styles.heroDot} />
            <AppText style={styles.heroCap}>{orders.length} total</AppText>
          </View>
        </LinearGradient>
      </Animated.View>

      {orders.length === 0 ? (
        <EmptyState
          icon="card-outline"
          title="No orders yet"
          description="Once you enrol in a programme or book tuition, your orders appear here."
        />
      ) : (
        <View style={styles.list}>
          {orders.map((o) => (
            <Card key={o.id} onPress={() => router.push(`/orders/${o.id}` as never)} padded style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="h3">{o.order_number}</AppText>
                <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                  {new Date(o.created_at).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </AppText>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <AppText variant="h3" style={{ color: colors.deep }}>{formatNaira(o.total_amount)}</AppText>
                <View style={[styles.statusPill, { backgroundColor: o.status === "PAID" ? colors.greenLight : colors.ink[100] }]}>
                  <AppText variant="caption" style={{ color: o.status === "PAID" ? colors.greenDark : colors.warning, fontWeight: "800" }}>
                    {o.status}
                  </AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Card padded style={styles.escrowNote}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.deep} />
        <AppText variant="caption" style={{ color: colors.ink[500], marginLeft: 10, flex: 1 }}>
          Fees are held in escrow and released to tutors only after lessons are delivered. Never pay a tutor directly off-platform.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: spacing.lg,
  },
  heroEyebrow: { color: "#70F250", letterSpacing: 1.4, fontSize: type.caption },
  heroAmount: { color: "#FFFFFF", fontSize: 38, marginTop: spacing.xs },
  heroSubRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, flexWrap: "wrap" },
  heroCap: { color: "rgba(255,255,255,0.72)", fontSize: type.bodySm },
  heroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  list: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 0 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  escrowNote: { marginTop: 16, flexDirection: "row", alignItems: "center" },
});
