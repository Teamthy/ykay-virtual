import { router, usePathname } from "expo-router";
<<<<<<< ours
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/src/lib/theme";

// Reusable bottom tab bar for the authenticated app. Uses expo-router's
// `router.push` so it works with the existing Stack navigation (no risky
// file-restructure into a (tabs) group). Highlight the current tab.
=======
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, type } from "@/src/lib/theme";

// Premium bottom tab bar — active pill indicator, spring scale + haptic on
// press, safe-area aware. Tabs route within the authenticated Stack.
>>>>>>> theirs

const TABS = [
  { key: "home", href: "/home", label: "Home", icon: "🏠" },
  { key: "lms", href: "/lms", label: "Learning", icon: "📚" },
  { key: "quizzes", href: "/quizzes", label: "Quizzes", icon: "📝" },
  { key: "account", href: "/account", label: "Account", icon: "👤" },
] as const;

<<<<<<< ours
export function TabBar() {
  const pathname = usePathname();

  return (
    <View style={styles.bar}>
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Pressable
            key={t.key}
            style={styles.tab}
            onPress={() => router.push(t.href as never)}
          >
            <Text style={styles.icon}>{t.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{t.label}</Text>
            {active && <View style={styles.dot} />}
          </Pressable>
=======
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 8 }]}>
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        const scale = useSharedValue(1);
        const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
        return (
          <AnimatedPressable
            key={t.key}
            style={[styles.tab, anim]}
            onPress={() => {
              scale.value = withSpring(0.9, { damping: 16, stiffness: 320 });
              void Haptics.selectionAsync().catch(() => {});
              router.push(t.href as never);
            }}
            onPressOut={() => (scale.value = withSpring(1, { damping: 16, stiffness: 320 }))}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Text style={styles.icon}>{t.icon}</Text>
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{t.label}</Text>
          </AnimatedPressable>
>>>>>>> theirs
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
<<<<<<< ours
    backgroundColor: colors.navy,
    paddingVertical: 8,
    paddingHorizontal: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  icon: { fontSize: 18 },
  label: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.65)" },
  labelActive: { color: colors.gold },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.gold, marginTop: 2 },
=======
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.ink[100],
  },
  tab: { flex: 1, alignItems: "center", gap: 3 },
  iconWrap: {
    width: 40,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: colors.goldLight },
  icon: { fontSize: 18 },
  label: { fontSize: type.caption, fontWeight: "600", color: colors.ink[400] },
  labelActive: { color: colors.navy, fontWeight: "800" },
>>>>>>> theirs
});
