import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/lib/theme-context";
import { fonts, layout, type } from "@/src/lib/theme";

// Premium bottom tab bar — active pill indicator, spring scale + haptic on
// press, safe-area aware, dark-mode aware. Tabs route within the
// authenticated Stack. Includes a visually emphasized center "Explore"
// primary action. The tab row is capped at contentMaxWidth and centred so
// tablets keep the phone-scale navigation model.

const TABS = [
  { key: "home", href: "/home", label: "Home", icon: "home", iconOutline: "home-outline" },
  { key: "lms", href: "/lms", label: "Learning", icon: "book", iconOutline: "book-outline" },
] as const;

const PRIMARY_ACTION = { href: "/search", label: "Explore", icon: "compass" } as const;

const SECONDARY = [
  { key: "notifications", href: "/notifications", label: "Alerts", icon: "notifications", iconOutline: "notifications-outline" },
  { key: "account", href: "/account", label: "Profile", icon: "person", iconOutline: "person-outline" },
] as const;

type IconName = keyof typeof Ionicons.glyphMap;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const { colors } = useTheme();
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
      <View style={[styles.iconWrap, active && { backgroundColor: colors.greenLight }]}>
        <Ionicons name={(active ? icon : iconOutline) as IconName} size={19} color={active ? colors.navy : colors.ink[400]} />
      </View>
      <Text style={[styles.label, styles.labelColor, { color: active ? colors.navy : colors.ink[400] }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.row}>
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

        {/* Primary action — visually emphasized (deep circle, lime glyph) */}
        <View style={styles.primarySlot}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              router.push(PRIMARY_ACTION.href as never);
            }}
            style={[styles.primaryAction, { backgroundColor: colors.deep, borderColor: colors.bg }]}
            accessibilityRole="button"
            accessibilityLabel={PRIMARY_ACTION.label}
          >
            <Ionicons name={PRIMARY_ACTION.icon as IconName} size={22} color={colors.green} />
          </Pressable>
          <Text style={[styles.primaryLabel, { color: colors.deep }]}>{PRIMARY_ACTION.label}</Text>
        </View>

        {SECONDARY.map((t) => {
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
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: layout.contentMaxWidth,
    width: "100%",
    alignSelf: "center",
  },
  tab: { flex: 1, alignItems: "center", gap: 3 },
  iconWrap: {
    width: 40,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontFamily: fonts.bodyMedium, fontSize: type.caption, fontWeight: "500" },
  labelColor: {},
  primarySlot: { flex: 1, alignItems: "center", gap: 3 },
  primaryAction: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    borderWidth: 3,
  },
  primaryLabel: { fontFamily: fonts.bodyBold, fontSize: type.caption, fontWeight: "700" },
});
