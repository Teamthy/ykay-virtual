import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/lib/theme-context";

// ThemeToggle — the light/dark switch shown in the top-right of every stack
// header. The header surface is always brand deep green, so the chip is a
// translucent white pill with a lime/white icon. One tap flips between light
// and dark; Profile → Appearance still offers the three-way system option.

export function ThemeToggle() {
  const { isDark, setMode } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => {});
        setMode(isDark ? "light" : "dark");
      }}
      style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={17} color={isDark ? "#70F250" : "#FFFFFF"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
