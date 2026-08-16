import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/src/lib/theme";

// Reusable bottom tab bar for the authenticated app. Uses expo-router's
// `router.push` so it works with the existing Stack navigation (no risky
// file-restructure into a (tabs) group). Highlight the current tab.

const TABS = [
  { key: "home", href: "/home", label: "Home", icon: "🏠" },
  { key: "lms", href: "/lms", label: "Learning", icon: "📚" },
  { key: "quizzes", href: "/quizzes", label: "Quizzes", icon: "📝" },
  { key: "account", href: "/account", label: "Account", icon: "👤" },
] as const;

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
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
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
});
