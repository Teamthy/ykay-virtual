import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Share, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import {
  applyReferral,
  formatNaira,
  getReferralCode,
  listReferrals,
  type Referral,
  type ReferralCode,
} from "@/src/lib/account";

// Referrals — your invite code, share link and the people you've referred.
// The reward is defined server-side; we display whatever the API returns.

export default function ReferralsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [code, setCode] = useState<ReferralCode | null>(null);
  const [refs, setRefs] = useState<Referral[]>([]);
  const [applyInput, setApplyInput] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([
        getReferralCode().catch(() => null),
        listReferrals().catch(() => [] as Referral[]),
      ]);
      setCode(c);
      setRefs(r);
    } catch {
      // ignore — session handled elsewhere
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const share = async () => {
    if (!code) return;
    const site =
      process.env.EXPO_PUBLIC_SITE_URL ?? "https://virtual.ykaycollege.com";
    const link = `${site}${code.share_link}`;
    try {
      await Share.share({
        message: `Join YK-Virtual with my invite code ${code.code} — ${link}`,
      });
    } catch {
      // user dismissed share sheet
    }
  };

  const apply = async () => {
    const c = applyInput.trim();
    if (!c) return;
    setBusy(true);
    try {
      await applyReferral(c);
      Alert.alert("Applied", "Referral code applied to your account.");
      setApplyInput("");
    } catch (e) {
      Alert.alert(
        "Could not apply",
        e instanceof Error ? e.message : "Check the code and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Growth"
        title="Referrals"
        subtitle="Invite families and earn when they join."
      />

      <Card padded style={styles.heroCard}>
        <AppText variant="label" style={{ color: colors.white, opacity: 0.7 }}>
          YOUR INVITE CODE
        </AppText>
        <AppText
          style={{
            fontSize: 34,
            fontWeight: "800",
            color: colors.gold,
            letterSpacing: 2,
            marginTop: 6,
          }}
        >
          {code?.code ?? "———"}
        </AppText>
        {code ? (
          <AppText
            variant="bodySm"
            style={{ color: colors.white, opacity: 0.9, marginTop: 6 }}
          >
            Reward: {formatNaira(code.reward)} {code.currency}
            {code.is_active ? "" : " · inactive"}
          </AppText>
        ) : null}
        <View style={{ height: 14 }} />
        <Button label="Share invite" full onPress={() => void share()} />
      </Card>

      <Card padded style={{ marginTop: 14 }}>
        <AppText variant="h3">Have a friend's code?</AppText>
        <AppText
          variant="bodySm"
          style={{ color: colors.ink[600], marginTop: 4, lineHeight: 19 }}
        >
          Apply it to your account.
        </AppText>
        <View style={{ height: 8 }} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <AppInput
              placeholder="Enter code"
              value={applyInput}
              onChangeText={setApplyInput}
              autoCapitalize="characters"
              editable={!busy}
            />
          </View>
          <Button label="Apply" onPress={() => void apply()} loading={busy} />
        </View>
      </Card>

      <AppText variant="label" style={styles.sectionTitle}>
        YOUR REFERRALS ({refs.length})
      </AppText>
      {refs.length === 0 ? (
        <Card padded>
          <AppText
            variant="bodySm"
            style={{ color: colors.ink[500], textAlign: "center" }}
          >
            No referrals yet. Share your invite code to start earning.
          </AppText>
        </Card>
      ) : (
        refs.map((r) => (
          <Card key={r.id} padded style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{formatNaira(r.reward_amount)}</AppText>
              <AppText
                variant="caption"
                style={{ color: colors.ink[400], marginTop: 2 }}
              >
                {r.status} ·{" "}
                {new Date(r.created_at).toLocaleDateString("en-NG")}
              </AppText>
            </View>
            <Ionicons
              name={r.rewarded_at ? "checkmark-circle" : "time-outline"}
              size={18}
              color={r.rewarded_at ? colors.success : colors.ink[300]}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    heroCard: { backgroundColor: colors.navy },
    sectionTitle: {
      color: colors.goldDark,
      letterSpacing: 1.1,
      fontSize: 12,
      marginTop: 24,
      marginBottom: 10,
    },
    row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  });
