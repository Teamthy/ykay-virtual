import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, radius, spacing } from "@/src/lib/theme";
import { apiFetch, listBanks, resolveBankAccount, type Bank } from "@/src/lib/api";
import { getTutorProfile } from "@/src/lib/tutor";

// Tutor bank details — pick a bank from the Nigerian list, enter the account
// number and auto-resolve the account name (Paystack), then save via the same
// backend as the web flow. Payouts stay fail-closed: save only, never trigger.

type Profile = { id: string; display_name: string };

export default function TutorBankScreen() {
  const { colors } = useTheme();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bank, setBank] = useState<Bank | null>(null);
  const [bankQuery, setBankQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [p, b] = await Promise.all([
            getTutorProfile().catch(() => null),
            listBanks().catch(() => [] as Bank[]),
          ]);
          if (cancelled) return;
          if (p) {
            setProfileId(p.id);
            if (p.display_name && !accountName) setAccountName(p.display_name);
          }
          setBanks(b);
        } catch {
          // no tutor profile yet — form still renders, save explains
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => b.name.toLowerCase().includes(q));
  }, [banks, bankQuery]);

  const resolveName = async () => {
    if (!bank || !/^\d{10}$/.test(accountNumber.trim())) {
      return Alert.alert("Check the account", "Pick a bank and enter a 10-digit account number first.");
    }
    setResolving(true);
    try {
      const name = await resolveBankAccount(accountNumber.trim(), bank.code);
      setAccountName(name);
    } catch (e) {
      Alert.alert("Could not resolve the name", e instanceof Error ? e.message : "Enter the account name manually.");
    } finally {
      setResolving(false);
    }
  };

  const save = async () => {
    if (!profileId) {
      return Alert.alert("No tutor profile", "Create your tutor profile on the web app first.");
    }
    if (!bank || !accountNumber.trim() || !accountName.trim()) {
      return Alert.alert("Missing details", "Bank, account number and account name are required.");
    }
    if (!/^\d{10}$/.test(accountNumber.trim())) {
      return Alert.alert("Check the account number", "Nigerian account numbers are 10 digits.");
    }
    setBusy(true);
    try {
      await apiFetch(`/tutors/me/vetting/profiles/${profileId}/bank`, {
        method: "POST",
        body: JSON.stringify({
          bank_name: bank.name,
          bank_code: bank.code,
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
        {/* Bank picker */}
        <AppText variant="label" style={{ marginBottom: 6 }}>Bank</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose bank"
          onPress={() => setPickerOpen(true)}
          style={[styles.picker, { backgroundColor: colors.surface, borderColor: colors.ink[100] }]}
        >
          <AppText variant="body" style={{ color: bank ? colors.ink[900] : colors.ink[300], flex: 1 }}>
            {bank ? bank.name : "Select your bank"}
          </AppText>
          <Ionicons name="chevron-down" size={16} color={colors.ink[400]} />
        </Pressable>

        <AppInput
          label="Account number"
          placeholder="10 digits"
          value={accountNumber}
          onChangeText={setAccountNumber}
          editable={!busy}
          keyboardType="number-pad"
          maxLength={10}
        />

        {/* Auto-resolve the account name */}
        <View style={styles.resolveRow}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Account name"
              placeholder="Resolves automatically"
              value={accountName}
              onChangeText={setAccountName}
              editable={!busy && !resolving}
              autoCapitalize="words"
            />
          </View>
          <Button
            label={resolving ? "…" : "Resolve"}
            loading={resolving}
            variant="secondary"
            style={{ marginTop: 18 }}
            onPress={() => void resolveName()}
          />
        </View>

        <Button label={busy ? "Saving…" : "Save bank details"} full loading={busy} onPress={() => void save()} />
      </Card>

      <Card padded style={styles.note}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.deep} />
        <AppText variant="caption" style={{ color: colors.ink[500], marginLeft: 10, flex: 1 }}>
          Payouts are only initiated from the platform after lessons are confirmed delivered. Your details are stored securely and never shared with learners.
        </AppText>
      </Card>

      {/* Bank picker modal */}
      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalBar, { backgroundColor: colors.deep }]}>
            <Pressable onPress={() => setPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Close bank list" style={styles.webClose}>
              <AppText style={{ color: colors.white, fontFamily: fonts.bodyBold, fontWeight: "700" }}>Cancel</AppText>
            </Pressable>
            <AppText style={{ color: colors.white, fontFamily: fonts.bodyBold }}>Select bank</AppText>
            <View style={{ width: 56 }} />
          </View>
          <View style={styles.modalSearch}>
            <AppInput placeholder="Search banks…" value={bankQuery} onChangeText={setBankQuery} autoCapitalize="none" />
          </View>
          <FlatList
            data={filteredBanks}
            keyExtractor={(b) => b.code}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: spacing.xl }}>
                No banks match your search.
              </AppText>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setBank(item);
                  setPickerOpen(false);
                }}
                style={[styles.bankRow, { borderBottomColor: colors.border }]}
              >
                <AppText variant="body" style={{ color: colors.ink[800], flex: 1 }}>
                  {item.name}
                </AppText>
                <AppText variant="caption" style={{ color: colors.ink[400] }}>
                  {item.code}
                </AppText>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  resolveRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  note: { marginTop: spacing.md, flexDirection: "row", alignItems: "center" },
  modalRoot: { flex: 1 },
  modalBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: 54,
    paddingBottom: spacing.sm,
  },
  webClose: { width: 56 },
  modalSearch: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
});
