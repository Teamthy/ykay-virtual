import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle, type StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/lib/theme-context";
import { layout } from "@/src/lib/theme";

// Premium screen wrapper — consistent padding, theme-aware background,
// optional gradient, scroll behaviour, and pull-to-refresh. Content is capped
// at contentMaxWidth and centred so the app stays balanced on tablets and
// large phones. Every screen composes this so chrome stays uniform.

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
  const { colors, isDark } = useTheme();

  const body = (
    <View
      style={[
        styles.inner,
        padded && { paddingHorizontal: layout.pagePadding },
        { maxWidth: layout.contentMaxWidth, width: "100%", alignSelf: "center" },
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
        { paddingBottom: insets.bottom + 24 },
        contentContainerStyle as StyleProp<ViewStyle>,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.greenDark}
            colors={[colors.greenDark]}
            progressBackgroundColor={isDark ? colors.surface : undefined}
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
    <View
      style={[
        styles.root,
        { backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom },
        style as StyleProp<ViewStyle>,
      ]}
    >
      {wrapped}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flexGrow: 1, paddingBottom: 32 },
  scrollContent: { flexGrow: 1 },
});
