import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { spacing } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";
import { getTutorProfile } from "@/src/lib/tutor";

// Tutor bank details — where payouts go. Saves via
// POST /tutors/me/vetting/profiles/{profileId}/bank (same backend as the web
// become-a-tutor flow). Payouts stay fail-closed: details are only saved,
// never triggered here.

type Profile = { id: string; display_name: string };

export default function TutorBankScreen() {
  const { colors } = useTheme();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const p = await getTutorProfile();
          if (cancelled) return;
          setProfileId(p.id);
          if (p.display_name) setAccountName(p.display_name);
        } catch {
          // no tutor profile yet
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const save = async () => {
    if (!profileId) {
      return Alert.alert("No tutor profile", "Create your tutor profile on the web app first.");
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      return Alert.alert("Missing details", "Bank name, account number and account name are required.");
    }
    if (!/^\d{10}$/.test(accountNumber.trim())) {
      return Alert.alert("Check the account number", "Nigerian account numbers are 10 digits.");
    }
    setBusy(true);
    try {
      await apiFetch(`/tutors/me/vetting/profiles/${profileId}/bank`, {
        method: "POST",
        body: JSON.stringify({
          bank_name: bankName.trim(),
          bank_code: bankCode.trim() || undefined,
          account_number: accountNumber.trim(),
          account_name: accountName.trim(),
        }),
      });
      Alert.alert("Bank details saved", "Payouts will go to this account once approved.");
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen scroll>
        <Skeleton height={120} />
        <Skeleton height={60} style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Payouts"
        title="Bank details"
        subtitle="Where your released earnings are paid out to."
      />

      <Card padded>
        <AppInput
          label="Bank name"
          placeholder="e.g. GTBank, Access Bank"
          value={bankName}
          onChangeText={setBankName}
          editable={!busy}
          autoCapitalize="words"
        />
        <AppInput
          label="Bank code (optional)"
          placeholder="e.g. 058"
          value={bankCode}
          onChangeText={setBankCode}
          editable={!busy}
          keyboardType="number-pad"
        />
        <AppInput
          label="Account number"
          placeholder="10 digits"
          value={accountNumber}
          onChangeText={setAccountNumber}
          editable={!busy}
          keyboardType="number-pad"
          maxLength={10}
        />
        <AppInput
          label="Account name"
          placeholder="Name on the account"
          value={accountName}
          onChangeText={setAccountName}
          editable={!busy}
          autoCapitalize="words"
        />
        <Button label={busy ? "Saving…" : "Save bank details"} full loading={busy} onPress={() => void save()} />
      </Card>

      <Card padded style={styles.note}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.deep} />
        <AppText variant="caption" style={{ color: colors.ink[500], marginLeft: 10, flex: 1 }}>
          Payouts are only initiated from the platform after lessons are confirmed delivered. Your details are stored securely and never shared with learners.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: spacing.md, flexDirection: "row", alignItems: "center" },
});
