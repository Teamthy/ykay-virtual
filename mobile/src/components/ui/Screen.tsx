import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle, type StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, layout } from "@/src/lib/theme";

// Premium screen wrapper — consistent padding, optional gradient/background,
// scroll behaviour, and pull-to-refresh. Every screen composes this so chrome
// stays uniform.

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  gradient?: readonly [string, string, ...string[]];
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  // Pull-to-refresh support (iOS/Android). Provide refreshing + onRefresh.
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({
  children,
  scroll = true,
  gradient,
  padded = true,
  style,
  contentContainerStyle,
  refreshing,
  onRefresh,
}: Props) {
  const insets = useSafeAreaInsets();

  const body = (
    <View
      style={[
        styles.inner,
        padded && { paddingHorizontal: layout.pagePadding },
        style as StyleProp<ViewStyle>,
      ]}
    >
      {children}
    </View>
  );

  const wrapped = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        contentContainerStyle as StyleProp<ViewStyle>,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
            colors={[colors.green]}
          />
        ) : undefined
      }
    >
      {body}
    </ScrollView>
  ) : (
    body
  );

  if (gradient) {
    return (
      <LinearGradient colors={gradient} style={[styles.root, { paddingTop: insets.top }]}>
        {wrapped}
      </LinearGradient>
    );
  }
  return (
    <View style={[styles.root, styles.plain, { paddingTop: insets.top }, style as StyleProp<ViewStyle>]}>
      {wrapped}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  plain: { backgroundColor: colors.bg },
  inner: { flexGrow: 1, paddingBottom: 32 },
  scrollContent: { flexGrow: 1 },
});
