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
        <Stack.Screen name="exam-prep/[exam]/[subject]" options={{ title: "Exam subject" }} />
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
        <Stack.Screen name="forgot-password" options={{ title: "Forgot password" }} />
        <Stack.Screen name="reset-password" options={{ title: "Reset password" }} />
        <Stack.Screen name="verify-email" options={{ title: "Verify email" }} />
        <Stack.Screen name="edit-profile" options={{ title: "Edit profile" }} />
        <Stack.Screen name="learners" options={{ title: "Learners" }} />
        <Stack.Screen name="referrals" options={{ title: "Referrals" }} />
        <Stack.Screen name="payments" options={{ title: "Payments" }} />
        <Stack.Screen name="about" options={{ title: "About NUVORA" }} />
        <Stack.Screen name="help" options={{ title: "Help" }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
        <Stack.Screen name="terms" options={{ title: "Terms" }} />
        <Stack.Screen name="become-tutor" options={{ title: "Become a tutor" }} />
        <Stack.Screen name="pricing" options={{ title: "Pricing" }} />
        <Stack.Screen name="careers" options={{ title: "Careers" }} />
        <Stack.Screen name="contact" options={{ title: "Contact & Support" }} />
        <Stack.Screen name="offline" options={{ title: "Offline" }} />
        <Stack.Screen name="messages" options={{ title: "Messages" }} />
        <Stack.Screen name="messages/[conversationId]" options={{ title: "Conversation" }} />
        <Stack.Screen name="my-lessons" options={{ title: "My lessons" }} />
        <Stack.Screen name="lesson-notes/[lessonId]" options={{ title: "Lesson notes" }} />
        <Stack.Screen name="orders/[orderId]" options={{ title: "Receipt" }} />
        <Stack.Screen name="devices" options={{ title: "Devices" }} />
        <Stack.Screen name="learning-progress" options={{ title: "Lesson progress" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
