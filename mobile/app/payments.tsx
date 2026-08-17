import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { formatNaira, listOrders, type Order } from "@/src/lib/account";

// Payments — your order history (GET /me/orders). Read-only: nothing here
// initiates payments or refunds.

export default function PaymentsScreen() {
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

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Billing"
        title="Payments"
        subtitle="Your orders and payment history."
      />

      {loading ? (
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 24 }}>
          Loading orders…
        </AppText>
      ) : orders.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No orders yet. Once you enrol in a programme or book tuition, your orders appear here.
          </AppText>
        </Card>
      ) : (
        orders.map((o) => (
          <Card key={o.id} padded style={styles.row}>
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
              <AppText variant="h3" style={{ color: colors.navy }}>{formatNaira(o.total_amount)}</AppText>
              <View style={[styles.statusPill, { backgroundColor: o.status === "PAID" ? "rgba(22,163,74,0.12)" : "rgba(245,158,11,0.15)" }]}>
                <AppText variant="caption" style={{ color: o.status === "PAID" ? colors.success : colors.warning, fontWeight: "800" }}>
                  {o.status}
                </AppText>
              </View>
            </View>
          </Card>
        ))
      )}

      <Card padded style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.navy} />
        <AppText variant="caption" style={{ color: colors.ink[500], marginLeft: 10, flex: 1 }}>
          Fees are held in escrow and released to tutors only after lessons are delivered. Never pay a tutor directly off-platform.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
});
