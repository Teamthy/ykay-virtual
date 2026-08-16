import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, ActivityIndicator, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { colors, radius, type, shadow } from "@/src/lib/theme";

// Premium button — spring scale on press, haptic tap, optional loading,
// variants (primary gold, secondary, ghost, dark).

type Variant = "primary" | "secondary" | "ghost" | "dark";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  full = false,
  icon,
  style,
}: Props) {
  const scale = useSharedValue(1);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.97, { damping: 18, stiffness: 260 });
    void Haptics.selectionAsync().catch(() => {});
  };
  const pressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 260 });
  };

  const bg =
    variant === "primary"
      ? colors.gold
      : variant === "secondary"
      ? colors.white
      : variant === "dark"
      ? colors.navy
      : "transparent";
  const fg =
    variant === "primary" || variant === "dark"
      ? variant === "primary"
        ? colors.ink[900]
        : colors.white
      : variant === "secondary"
      ? colors.navy
      : colors.navy;
  const border =
    variant === "secondary" || variant === "ghost"
      ? { borderWidth: 1, borderColor: colors.ink[200] }
      : {};

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled || loading}
      style={[
        styles.base,
        { backgroundColor: bg },
        border as ViewStyle,
        full && styles.full,
        (disabled || loading) && { opacity: 0.5 },
        shadow.md,
        anim,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radius.lg,
  },
  full: { width: "100%" },
  label: { fontSize: type.body, fontWeight: "700", letterSpacing: 0.2 },
});
