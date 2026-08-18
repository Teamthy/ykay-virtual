import { useState } from "react";
import { router } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/ui/AppText";
import { Button } from "@/src/components/ui/Button";
import { colors, radius, spacing, type } from "@/src/lib/theme";

// Premium 3-screen onboarding intro — icon illustration, concise headline,
// short explanation, progress dots, primary CTA + skip. Composed from the
// shared primitives so it feels cohesive with the rest of the app.

const SLIDES = [
  {
    icon: "school-outline",
    title: "Learn with vetted tutors",
    body: "British & Nigerian curricula, exam prep and live cohorts — guided by ID-verified, background-checked tutors.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Payments you can trust",
    body: "Your tuition sits in escrow until your lessons are delivered. Refunds and disputes handled safely.",
  },
  {
    icon: "stats-chart-outline",
    title: "Track real progress",
    body: "Attendance, assignments, quizzes and tutor progress reports — all in one place for parents and learners.",
  },
] as const;

export function OnboardingCarousel() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <FlatList
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconWrap}>
              <Ionicons name={item.icon} size={52} color={colors.green} />
            </View>
            <AppText variant="display" style={{ textAlign: "center", marginTop: spacing.xl }}>
              {item.title}
            </AppText>
            <AppText variant="body" style={{ textAlign: "center", color: colors.ink[600], marginTop: spacing.md, lineHeight: 22 }}>
              {item.body}
            </AppText>
          </View>
        )}
      />

      {/* Progress dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      {/* CTAs */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button label={last ? "Get started" : "Next"} onPress={() => (last ? router.replace("/login") : undefined)} full />
        {!last && (
          <Button label="Skip" variant="ghost" onPress={() => router.replace("/login")} full />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  slide: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 112,
    height: 112,
    borderRadius: radius.xl,
    backgroundColor: colors.greenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.xs, marginVertical: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink[200] },
  dotActive: { width: 24, backgroundColor: colors.green },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.sm },
});
