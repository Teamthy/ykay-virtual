import { useEffect, useRef } from "react";
import { Animated, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "@/src/lib/theme-context";
import { radius } from "@/src/lib/theme";

// Skeleton loader — shimmer/pulse placeholder that preserves layout. Use it
// instead of spinners so the UI doesn't jump when content loads.

type Props = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = "100%", height = 16, radius: r = radius.sm, style }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: r, opacity, backgroundColor: colors.ink[200] },
        style,
      ]}
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    />
  );
}

// A convenient card skeleton (header + a few lines) for list loading.
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <>
      <Skeleton height={140} radius={radius.lg} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={12} style={{ marginTop: 10 }} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  base: {},
});
