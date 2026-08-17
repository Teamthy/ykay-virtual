import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { Button } from "@/src/components/ui/Button";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";

// Offline — shown when the device has no connection. Suggests retrying or
// reaching support via the web.

export default function OfflineScreen() {
  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <View style={styles.icon}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.navy} />
        </View>
        <AppText variant="h1" style={{ marginTop: 20 }}>You're offline</AppText>
        <AppText variant="bodySm" style={{ color: colors.ink[500], marginTop: 8, textAlign: "center", lineHeight: 20 }}>
          NUVORA needs an internet connection to load your lessons, messages and account.
          Check your connection and try again.
        </AppText>
        <View style={{ marginTop: 24, width: "100%" }}>
          <Button label="Retry" full onPress={() => undefined} />
        </View>
        <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 16, textAlign: "center" }}>
          Still stuck? Reach us at support@nuvora.com when you're back online.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
