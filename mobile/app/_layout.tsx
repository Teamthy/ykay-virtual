import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/src/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.cream },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Log in" }} />
        <Stack.Screen name="onboarding" options={{ title: "Get started", headerBackVisible: false }} />
        <Stack.Screen name="home" options={{ title: "NUVORA", headerBackVisible: false }} />
        <Stack.Screen name="chat" options={{ title: "Chat with Nuvora" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
