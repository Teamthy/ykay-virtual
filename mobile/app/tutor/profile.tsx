import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/src/components/ui/Screen";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { Card } from "@/src/components/ui/Card";
import { AppText } from "@/src/components/ui/AppText";
import { colors } from "@/src/lib/theme";
import { formatNaira, getTutorProfile, type TutorProfile } from "@/src/lib/tutor";

// Tutor profile — vetting status, subjects, rates and teaching stats, read
// from the same profile as the web become-a-tutor flow.

export default function TutorProfileScreen() {
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setProfile(await getTutorProfile());
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => void load(), [load]));

  if (!loading && !profile) {
    return (
      <Screen scroll>
        <ScreenHeader eyebrow="Profile" title="No tutor profile yet" />
        <Card padded>
          <AppText variant="bodySm" style={{ color: colors.ink[600], textAlign: "center" }}>
            You haven&apos;t created a tutor profile. Start at Become a tutor on the web app to
            choose subjects, upload ID and pass the subject assessment.
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="Profile"
        title={profile?.display_name ?? "Tutor profile"}
        subtitle={profile?.headline ?? "Your public tutor identity."}
      />

      <Card padded style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Ionicons
            name={profile?.verified_at ? "shield-checkmark" : "shield-outline"}
            size={22}
            color={profile?.verified_at ? colors.success : colors.warning}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText variant="h3">{profile?.verified_at ? "Verified tutor" : "Pending verification"}</AppText>
            <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
              Status: {profile?.status ?? "—"}
            </AppText>
          </View>
        </View>
      </Card>

      <AppText variant="label" style={styles.sectionTitle}>
        AT A GLANCE
      </AppText>
      <View style={styles.statRow}>
        <Card padded style={styles.statCard}>
          <AppText variant="h2" style={{ color: colors.navy }}>
            {profile?.rating_count ? `${profile.rating_avg.toFixed(1)}★` : "—"}
          </AppText>
          <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
            RATING ({profile?.rating_count ?? 0} reviews)
          </AppText>
        </Card>
        <Card padded style={styles.statCard}>
          <AppText variant="h2" style={{ color: colors.navy }}>
            {profile?.total_hours_taught ?? 0}h
          </AppText>
          <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
            HOURS TAUGHT
          </AppText>
        </Card>
      </View>

      <AppText variant="label" style={styles.sectionTitle}>
        RATE
      </AppText>
      <Card padded>
        <AppText variant="h3">
          {profile?.hourly_rate_min != null
            ? `${formatNaira(profile.hourly_rate_min)}${profile.hourly_rate_max != null ? ` – ${formatNaira(profile.hourly_rate_max)}` : ""}`
            : "Set your rate on the web app"}
        </AppText>
        <AppText variant="caption" style={{ color: colors.ink[400], marginTop: 2 }}>
          {profile?.currency ?? "NGN"} per hour · {profile?.accepts_online ? "Online" : "In person"}{" "}
          {profile?.accepts_in_person && profile?.accepts_online ? "· In person" : ""}
        </AppText>
      </Card>

      <AppText variant="label" style={styles.sectionTitle}>
        SUBJECTS
      </AppText>
      <Card padded>
        {(profile?.subjects ?? []).length === 0 ? (
          <AppText variant="bodySm" style={{ color: colors.ink[500] }}>
            No subjects listed yet — add them during application.
          </AppText>
        ) : (
          <View style={styles.chips}>
            {(profile?.subjects ?? []).map((s) => (
              <View key={s.name} style={styles.chip}>
                <AppText variant="caption" style={{ color: colors.navy, fontWeight: "700" }}>
                  {s.name}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusCard: {},
  statusRow: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { color: colors.goldDark, letterSpacing: 1.1, fontSize: 12, marginTop: 24, marginBottom: 10 },
  statRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: colors.goldLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
