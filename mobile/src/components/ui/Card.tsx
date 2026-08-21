import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/lib/theme-context";
import { radius, shadow } from "@/src/lib/theme";

// Premium surface card — soft shadow, rounded, optional press feedback.
// Theme-aware: dark mode uses a dark surface + hairline border instead of a
// shadow (the elevation hierarchy flips to borders on dark surfaces).

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: ViewStyle;
};

export function Card({ children, onPress, padded = true, style }: Props) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const Wrapper = onPress ? AnimatedPressable : View;

  return (
    <Wrapper
      onPress={
        onPress
          ? () => {
              scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
              void Haptics.selectionAsync().catch(() => {});
              onPress();
            }
          : undefined
      }
      onPressIn={onPress ? () => (scale.value = withSpring(0.98)) : undefined}
      onPressOut={onPress ? () => (scale.value = withSpring(1)) : undefined}
      style={[
        styles.base,
        { backgroundColor: colors.surface, borderColor: isDark ? colors.border : "transparent" },
        padded && styles.padded,
        isDark ? styles.darkBorder : shadow.md,
        onPress && anim,
        style,
      ]}
    >
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
  },
  padded: { padding: 18 },
  darkBorder: { borderWidth: 1 },
});
