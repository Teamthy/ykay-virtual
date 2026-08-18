import { useEffect, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/src/lib/theme";
import { setUnauthorizedHandler } from "@/src/lib/api";
import { parseTarget, openNotification } from "@/src/lib/deeplink";
import { UpdateBanner } from "@/src/components/UpdateBanner";
import { View } from "react-native";

// Configure push notifications: show a banner/alert while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  const router = useRouter();
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null>(null);

  // When any API call returns 401 (expired/revoked session), route the app to
  // the login screen. The apiFetch client clears the stale token first.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      router.replace("/login");
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  // Deep-linking: when the app is opened by tapping a push notification, route
  // to the related screen (message thread, course, receipt, etc.).
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      openNotification(parseTarget(data));
    });
    return () => {
      responseListener.current?.remove();
      responseListener.current = null;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {/* OTA update banner: checks on mount and prompts the user to restart
          and apply a new bundle (published via `eas update`). */}
      <UpdateBanner />
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
        <Stack.Screen name="wizard/profile" options={{ title: "Profile", headerBackVisible: false }} />
        <Stack.Screen name="wizard/goals" options={{ title: "Goals", headerBackVisible: false }} />
        <Stack.Screen name="recommendations" options={{ title: "For you" }} />
        <Stack.Screen name="subjects" options={{ title: "Subjects" }} />
        <Stack.Screen name="subjects/[slug]" options={{ title: "Subject" }} />
        <Stack.Screen name="exam-prep" options={{ title: "Exam preparation" }} />
        <Stack.Screen name="exam-prep/[exam]/[subject]" options={{ title: "Exam subject" }} />
        <Stack.Screen name="search" options={{ title: "Find a tutor" }} />
        <Stack.Screen name="saved" options={{ title: "Saved tutors" }} />
        <Stack.Screen name="tutors/[slug]" options={{ title: "Tutor" }} />
        <Stack.Screen name="tutor-reviews/[slug]" options={{ title: "Reviews" }} />
        <Stack.Screen name="programmes/[slug]" options={{ title: "Programme" }} />
        <Stack.Screen name="cohorts/[id]" options={{ title: "Cohort" }} />
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
