import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { AppInput } from "@/src/components/ui/AppInput";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import { apiFetch, setToken } from "@/src/lib/api";
import { deleteAccount, updateProfile, type Me } from "@/src/lib/account";

// Edit profile — first/last name, phone, timezone (PUT /auth/me/profile) plus
// a guarded delete-account action at the bottom.

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [me, setMe] = useState<Me | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const m = (await apiFetch<Me>("/auth/me")).data;
      setMe(m);
      setFirstName(m.first_name ?? "");
      setLastName(m.last_name ?? "");
      setPhone(m.phone ?? "");
      setTimezone(m.timezone ?? "");
    } catch {
      setMe(null);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const save = async () => {
    setBusy(true);
    void Haptics.selectionAsync().catch(() => {});
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        timezone: timezone.trim(),
      });
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account and data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              await setToken(null);
              router.replace("/login" as never);
            } catch (e) {
              Alert.alert("Could not delete", e instanceof Error ? e.message : "Please contact support.");
            }
          },
        },
      ]
    );
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Account"
        title="Edit profile"
        subtitle={me?.email ?? ""}
      />

      <Card padded>
        <AppInput label="First name" value={firstName} onChangeText={setFirstName} editable={!busy} autoComplete="given-name" />
        <AppInput label="Last name" value={lastName} onChangeText={setLastName} editable={!busy} autoComplete="family-name" />
        <AppInput
          label="Phone / WhatsApp"
          value={phone}
          onChangeText={setPhone}
          editable={!busy}
          keyboardType="phone-pad"
          placeholder="+234…"
        />
        <AppInput
          label="Timezone"
          value={timezone}
          onChangeText={setTimezone}
          editable={!busy}
          placeholder="Africa/Lagos"
          autoCapitalize="none"
        />
        <View style={{ height: 8 }} />
        <Button label="Save changes" loading={busy} full onPress={() => void save()} />
      </Card>

      <AppText variant="label" style={styles.dangerTitle}>
        DANGER ZONE
      </AppText>
      <Card padded style={styles.dangerCard}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <AppText variant="h3" style={{ marginLeft: 10 }}>Delete account</AppText>
        </View>
        <AppText variant="bodySm" style={{ color: colors.ink[600], marginTop: 6, lineHeight: 19 }}>
          Permanently delete your account and everything we hold about you.
        </AppText>
        <View style={{ height: 12 }} />
        <Button label="Delete my account" variant="secondary" full onPress={confirmDelete} />
      </Card>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  dangerTitle: { color: colors.danger, letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  dangerCard: { borderWidth: 1, borderColor: colors.danger },
});
