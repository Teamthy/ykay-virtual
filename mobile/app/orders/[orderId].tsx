import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Order receipt — one order with its items and payments
// (GET /me/orders/{orderId}, owner-only). Read-only.

type ReceiptOrder = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
};

type ReceiptItem = {
  id: string;
  item_type: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type ReceiptPayment = {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  paid_at?: string | null;
  created_at: string;
};

type Receipt = {
  order: ReceiptOrder;
  items: ReceiptItem[];
  payments: ReceiptPayment[];
};

function naira(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `₦${v.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export default function OrderReceiptScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Receipt>(`/me/orders/${orderId}`);
      setReceipt(res.data);
    } catch {
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(useCallback(() => void load(), [load]));

  if (loading) {
    return (
      <Screen scroll>
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 48 }}>
          Loading receipt…
        </AppText>
      </Screen>
    );
  }

  if (!receipt) {
    return (
      <Screen scroll>
        <AppText variant="h2" style={{ marginTop: 32 }}>Receipt not found</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 8 }}>
          This order may belong to another account.
        </AppText>
      </Screen>
    );
  }

  const o = receipt.order;

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Receipt"
        title={o.order_number}
        subtitle={new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
      />

      <Card padded style={styles.totalCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText variant="label" style={{ color: colors.ink[500] }}>TOTAL PAID</AppText>
          <AppText variant="h2" style={{ color: colors.navy }}>{naira(o.total_amount)}</AppText>
        </View>
        <View style={styles.statusPill}>
          <AppText variant="caption" style={{ color: o.status === "PAID" ? colors.success : colors.warning, fontWeight: "800" }}>
            {o.status}
          </AppText>
        </View>
        <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 6 }}>
          Subtotal {naira(o.subtotal)} · Discount {naira(o.discount_amount)}
        </AppText>
      </Card>

      <AppText variant="label" style={styles.sectionTitle}>ITEMS</AppText>
      {receipt.items.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>No items on this order.</AppText>
        </Card>
      ) : (
        receipt.items.map((it) => (
          <Card key={it.id} padded style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{it.description ?? it.item_type}</AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                {it.item_type} · qty {it.quantity} × {naira(it.unit_price)}
              </AppText>
            </View>
            <AppText variant="h3" style={{ color: colors.navy }}>{naira(it.total_price)}</AppText>
          </Card>
        ))
      )}

      <AppText variant="label" style={styles.sectionTitle}>PAYMENTS</AppText>
      {receipt.payments.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>No payments recorded yet.</AppText>
        </Card>
      ) : (
        receipt.payments.map((p) => (
          <Card key={p.id} padded style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{p.provider}</AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                {p.status}
                {p.paid_at ? ` · paid ${new Date(p.paid_at).toLocaleDateString("en-NG")}` : ""}
              </AppText>
            </View>
            <AppText variant="h3" style={{ color: colors.navy }}>{naira(p.amount)}</AppText>
          </Card>
        ))
      )}

      <Card padded style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.navy} />
        <AppText variant="caption" style={{ color: colors.ink[500], marginLeft: 10, flex: 1 }}>
          Payments are escrow-protected. Fees are released to tutors only after lessons are delivered.
        </AppText>
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  totalCard: {},
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
    backgroundColor: "rgba(22,163,74,0.12)",
  },
  sectionTitle: { color: colors.goldDark, letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
});
