import { useMemo } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";

// Pricing — the published plan prices, mirrored from the web /pricing page.
// No invented figures: these are the same four plans and prices shown on the
// website.

const PLANS = [
  {
    name: "Cohort",
    price: "₦35,000",
    per: "per term · or ₦11,700/mo over 3 payments",
    desc: "Small-group live classes for exam prep",
    features: ["Live lessons with a vetted tutor", "Lesson notes, resources & homework", "Weekly progress reports", "Escrow-protected payment"],
    popular: false,
  },
  {
    name: "Private Tuition",
    price: "₦8,000",
    per: "per hour",
    desc: "One-to-one with a top-rated tutor",
    features: ["One-to-one, 60-minute sessions", "Flexible scheduling — home or online", "Attendance tracking", "Escrow-protected payment"],
    popular: true,
  },
  {
    name: "NUVORA Plus",
    price: "₦52,500",
    per: "per month",
    desc: "Premium tutoring with a dedicated mentor",
    features: ["Priority matching with vetted specialists", "Dedicated learning mentor", "Priority scheduling", "Weekly premium reports"],
    popular: false,
  },
  {
    name: "Schools & Corporate",
    price: "Custom",
    per: "bulk seats for institutions & teams",
    desc: "Pooled invoices, teacher assignment and custom curricula",
    features: ["Bulk enrolment with pooled invoices", "Assign teachers & track progress", "Dedicated account manager", "Custom curricula"],
    popular: false,
  },
] as const;

export default function PricingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Plans"
        title="Simple, honest pricing"
        subtitle="Every plan includes escrow protection — fees are released to tutors only after lessons are delivered."
      />

      {PLANS.map((p) => (
        <Card key={p.name} padded style={p.popular ? { ...styles.plan, borderWidth: 2, borderColor: colors.gold } : styles.plan}>
          {p.popular && (
            <View style={styles.popularPill}>
              <AppText variant="caption" style={{ color: colors.ink[900], fontWeight: "800" }}>MOST POPULAR</AppText>
            </View>
          )}
          <AppText variant="h2" style={{ color: colors.navy }}>{p.name}</AppText>
          <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 2 }}>{p.desc}</AppText>
          <AppText style={{ fontSize: 30, fontWeight: "800", color: colors.navy, marginTop: 10 }}>{p.price}</AppText>
          <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>{p.per}</AppText>
          <View style={{ height: 12 }} />
          {p.features.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <AppText variant="bodySm" style={{ color: colors.ink[700], marginLeft: 8, flex: 1, lineHeight: 19 }}>{f}</AppText>
            </View>
          ))}
        </Card>
      ))}

      <View style={{ marginTop: 16 }}>
        <Button label="See full pricing & compare" variant="secondary" full onPress={() => void Linking.openURL("https://nuvora.com/pricing")} />
      </View>

      <AppText variant="caption" style={{ color: colors.ink[400], textAlign: "center", marginTop: 16 }}>
        Prices shown are the published web prices and may change — always confirm on nuvora.com/pricing.
      </AppText>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  plan: { marginBottom: 12 },
  popularPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  featureRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
});
