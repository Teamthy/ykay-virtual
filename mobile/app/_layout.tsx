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
        <Stack.Screen name="subjects" options={{ title: "Subjects" }} />
        <Stack.Screen name="subjects/[slug]" options={{ title: "Subject" }} />
        <Stack.Screen name="exam-prep" options={{ title: "Exam preparation" }} />
        <Stack.Screen name="search" options={{ title: "Find a tutor" }} />
        <Stack.Screen name="saved" options={{ title: "Saved tutors" }} />
        <Stack.Screen name="tutors/[slug]" options={{ title: "Tutor" }} />
        <Stack.Screen name="tutor/index" options={{ title: "Tutor hub" }} />
        <Stack.Screen name="tutor/earnings" options={{ title: "Earnings" }} />
        <Stack.Screen name="tutor/lessons" options={{ title: "My lessons" }} />
        <Stack.Screen name="tutor/schedule" options={{ title: "Schedule" }} />
        <Stack.Screen name="tutor/messages" options={{ title: "Messages" }} />
        <Stack.Screen name="tutor/messages/[conversationId]" options={{ title: "Conversation" }} />
        <Stack.Screen name="tutor/profile" options={{ title: "Tutor profile" }} />
        <Stack.Screen name="tutor/availability" options={{ title: "Availability" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
