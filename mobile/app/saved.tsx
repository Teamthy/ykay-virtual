import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { readSaved, removeSaved, type SavedTutor } from "@/src/lib/wishlist";

// Saved tutors — device-local wishlist (same behaviour as the web /saved page).

export default function SavedTutorsScreen() {
  const [saved, setSaved] = useState<SavedTutor[]>([]);

  const load = useCallback(async () => {
    setSaved(await readSaved());
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  const remove = async (slug: string) => {
    setSaved(await removeSaved(slug));
  };

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Wishlist"
        title="Saved tutors"
        subtitle={`${saved.length} tutor${saved.length === 1 ? "" : "s"} on your list — stored on this device.`}
      />

      {saved.length === 0 ? (
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[500], textAlign: "center" }}>
            No saved tutors yet. Tap the heart on any tutor to keep them here.
          </AppText>
        </Card>
      ) : (
        saved.map((t) => (
          <Card key={t.slug} padded style={styles.row}>
            <View style={styles.avatar}>
              <AppText style={{ fontWeight: "800", color: colors.navy }}>{t.name.slice(0, 1)}</AppText>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="h3" onPress={() => router.push(`/tutors/${t.slug}` as never)}>
                {t.name}
              </AppText>
              <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }} numberOfLines={1}>
                {t.subjects.join(", ") || "General"}
              </AppText>
              <AppText variant="caption" style={{ color: colors.goldDark, marginTop: 2, fontWeight: "700" }}>
                {t.rating > 0 ? `${t.rating.toFixed(1)}★` : "New"}
              </AppText>
            </View>
            <Ionicons name="trash-outline" size={18} color={colors.danger} onPress={() => void remove(t.slug)} />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
