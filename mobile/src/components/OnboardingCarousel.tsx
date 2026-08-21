import { useState } from "react";
import { router } from "expo-router";
import { Image, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/src/components/ui/AppText";
import { Button } from "@/src/components/ui/Button";
import { useTheme } from "@/src/lib/theme-context";
import { radius, spacing } from "@/src/lib/theme";

// Premium 3-page onboarding intro — SINGULAR pages (no swipe carousel):
// each page shows one illustration, a concise headline, a short explanation
// and its own progress dots + Next/Skip CTA. The last page ends with
// "Get started". Pages advance only via the explicit CTA.

const SLIDES = [
  {
    image: require("@/assets/images/wizard/learn.jpg"),
    title: "Learn with vetted tutors",
    body: "British & Nigerian curricula, exam prep and live cohorts — guided by ID-verified, background-checked tutors.",
  },
  {
    image: require("@/assets/images/wizard/escrow.jpg"),
    title: "Payments you can trust",
    body: "Your tuition sits in escrow until your lessons are delivered. Refunds and disputes handled safely.",
  },
  {
    image: require("@/assets/images/wizard/progress.jpg"),
    title: "Track real progress",
    body: "Attendance, assignments, quizzes and tutor progress reports — all in one place for parents and learners.",
  },
] as const;

export function OnboardingCarousel() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;
  const item = SLIDES[index];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Animated.View
        key={index}
        entering={FadeInUp.duration(320).springify().damping(18)}
        style={styles.page}
      >
        <View style={[styles.imageWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Image source={item.image} style={styles.image} resizeMode="cover" />
        </View>
        <AppText variant="display" style={{ textAlign: "center", marginTop: spacing.xl }}>
          {item.title}
        </AppText>
        <AppText variant="body" style={{ textAlign: "center", color: colors.ink[600], marginTop: spacing.md, lineHeight: 22 }}>
          {item.body}
        </AppText>
      </Animated.View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { backgroundColor: i === index ? colors.greenDark : colors.ink[200] }, i === index && styles.dotActive]}
          />
        ))}
      </View>

      {/* CTAs — singular-page navigation, no swipe */}
      <Animated.View
        entering={FadeInDown.duration(260)}
        style={[styles.actions, { paddingBottom: insets.bottom + spacing.lg }]}
      >
        {last ? (
          <Button label="Get started" full onPress={() => router.replace("/login")} />
        ) : (
          <Button label="Next" full onPress={() => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))} />
        )}
        {!last && (
          <Button label="Skip" variant="ghost" onPress={() => router.replace("/login")} full />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  imageWrap: {
    width: "62%",
    aspectRatio: 1,
    maxWidth: 264,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
  },
  image: { width: "100%", height: "100%" },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.xs, marginVertical: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.sm },
});
