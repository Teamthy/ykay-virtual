import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { useTheme } from "@/src/lib/theme-context";
import { type ThemeColors } from "@/src/lib/theme";
import { apiFetch } from "@/src/lib/api";

// Devices — the devices that can receive push notifications for this account
// (GET /me/devices). Push tokens are masked; removing a device stops its
// notifications.

type Device = {
  id: string;
  platform: string;
  app_version?: string | null;
  last_seen_at: string;
  created_at: string;
};

const PLATFORM_ICON: Record<string, string> = {
  ios: "phone-portrait-outline",
  android: "phone-portrait-outline",
  web: "laptop-outline",
};

function maskToken(id: string): string {
  return id.length > 8 ? `•••• ${id.slice(-6)}` : "••••";
}

export default function DevicesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<Device[]>("/me/devices");
      setDevices(res.data ?? []);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const remove = (id: string) => {
    Alert.alert("Remove device?", "This device will stop receiving notifications.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/me/devices/${id}`, { method: "DELETE" });
            await load();
          } catch (e) {
            Alert.alert("Could not remove", e instanceof Error ? e.message : "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Account"
        title="Devices"
        subtitle="The devices that can receive notifications for your account."
      />

      {loading ? (
        <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center", marginTop: 24 }}>
          Loading devices…
        </AppText>
      ) : devices.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No registered devices yet. This device registers automatically when you log in.
          </AppText>
        </Card>
      ) : (
        devices.map((d) => (
          <Card key={d.id} padded style={styles.row}>
            <View style={styles.icon}>
              <Ionicons
                name={(PLATFORM_ICON[d.platform] ?? "phone-portrait-outline") as keyof typeof Ionicons.glyphMap}
                size={18}
                color={colors.navy}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="h3">
                {d.platform === "web" ? "Web browser" : d.platform === "ios" ? "iPhone / iPad" : "Android device"}
              </AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                {maskToken(d.id)}
                {d.app_version ? ` · v${d.app_version}` : ""}
              </AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
                Last seen {new Date(d.last_seen_at).toLocaleDateString("en-NG")}
              </AppText>
            </View>
            <Ionicons name="trash-outline" size={18} color={colors.danger} onPress={() => remove(d.id)} />
          </Card>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
