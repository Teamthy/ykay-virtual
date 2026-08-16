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
        {/* A-24: register the LMS screens so they get proper titles instead of
            the raw route name ("lms/[cohortId]") in the native header. */}
        <Stack.Screen name="lms" options={{ title: "My Learning" }} />
        <Stack.Screen name="lms/[cohortId]" options={{ title: "Course" }} />
        <Stack.Screen name="chat" options={{ title: "Chat with Nuvora" }} />
        <Stack.Screen name="quizzes" options={{ title: "Quizzes" }} />
        <Stack.Screen name="quizzes/[assessmentId]" options={{ title: "Quiz" }} />
        <Stack.Screen name="progress" options={{ title: "Progress" }} />
        <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="account" options={{ title: "Account" }} />
        <Stack.Screen name="wizard" options={{ title: "Welcome", headerBackVisible: false }} />
        <Stack.Screen name="recommendations" options={{ title: "For you" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
