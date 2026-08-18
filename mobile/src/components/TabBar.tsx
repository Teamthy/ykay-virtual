import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, type } from "@/src/lib/theme";

// Premium bottom tab bar — active pill indicator, spring scale + haptic on
// press, safe-area aware. Tabs route within the authenticated Stack.

const TABS = [
  { key: "home", href: "/home", label: "Home", icon: "home", iconOutline: "home-outline" },
  { key: "lms", href: "/lms", label: "Learning", icon: "book", iconOutline: "book-outline" },
  { key: "quizzes", href: "/quizzes", label: "Quizzes", icon: "create", iconOutline: "create-outline" },
  { key: "account", href: "/account", label: "Account", icon: "person", iconOutline: "person-outline" },
] as const;

type IconName = keyof typeof Ionicons.glyphMap;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// TabItem is a separate component so the animated shared values are created
// per tab (React rules of hooks — never call hooks inside a loop/map).
function TabItem({
  href,
  label,
  icon,
  iconOutline,
  active,
}: {
  href: string;
  label: string;
  icon: IconName;
  iconOutline: IconName;
  active: boolean;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      style={[styles.tab, anim]}
      onPress={() => {
        scale.value = withSpring(0.9, { damping: 16, stiffness: 320 });
        void Haptics.selectionAsync().catch(() => {});
        router.push(href as never);
      }}
      onPressOut={() => (scale.value = withSpring(1, { damping: 16, stiffness: 320 }))}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
        <Ionicons name={(active ? icon : iconOutline) as IconName} size={19} color={active ? colors.navy : colors.ink[400]} />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 8 }]}>
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <TabItem
            key={t.key}
            href={t.href}
            label={t.label}
            icon={t.icon as IconName}
            iconOutline={t.iconOutline as IconName}
            active={active}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
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
  label: { fontSize: type.caption, fontWeight: "600", color: colors.ink[400] },
  labelActive: { color: colors.navy, fontWeight: "800" },
});
