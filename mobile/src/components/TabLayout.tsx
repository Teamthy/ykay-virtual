import { StyleSheet, View } from "react-native";
import { TabBar } from "@/src/components/TabBar";

// Dashboard tab layout — renders children in a scrollable area with a fixed
// bottom tab bar, so the tab bar is always visible (native-app feel) instead
// of scrolling away with the content.

export function TabLayout({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <View style={styles.content}>{children}</View>
      <TabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
