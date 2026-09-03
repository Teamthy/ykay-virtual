import { useEffect, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Anton_400Regular } from "@expo-google-fonts/anton";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
// Type-only import: `expo-notifications` is loaded lazily below (never inside
// Expo Go, where the bare import logs a scary "removed from Expo Go" error).
import type * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "@/src/lib/theme-context";
import { LearnerProvider } from "@/src/lib/learner-context";
import { colors, fonts } from "@/src/lib/theme";
import { setUnauthorizedHandler } from "@/src/lib/api";
import { parseTarget, openNotification } from "@/src/lib/deeplink";
import { UpdateBanner } from "@/src/components/UpdateBanner";
import { ThemeToggle } from "@/src/components/ThemeToggle";
import { View } from "react-native";

// Keep the native splash visible until the brand fonts (Anton + DM Sans) are
// ready, so the first frame never flashes with fallback system type.
void SplashScreen.preventAutoHideAsync().catch(() => {});

// Expo Go (SDK 53+) no longer supports remote push notifications — running in
// it is a PREVIEW mode. Skip every notification side-effect there so the app
// stays clean; a development build (expo-dev-client) gets full push.
const IS_EXPO_GO = Constants.appOwnership === "expo";

// Configure push notifications: show a banner/alert while the app is open.
// Loaded lazily: in Expo Go the mere import of expo-notifications logs a
// fatal-looking ERROR (SDK 53+ removed remote push there), so it is never
// loaded in preview mode. A development build gets full push.
if (!IS_EXPO_GO) {
  void import("expo-notifications").then(({ setNotificationHandler }) => {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  });
}

export default function RootLayout() {
  const router = useRouter();
  const responseListener = useRef<ReturnType<
    typeof Notifications.addNotificationResponseReceivedListener
  > | null>(null);

  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

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
    if (IS_EXPO_GO) return; // push never fires in Expo Go
    void import("expo-notifications").then((Notifications) => {
      responseListener.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          openNotification(parseTarget(data));
        });
    });
    return () => {
      responseListener.current?.remove();
      responseListener.current = null;
    };
  }, []);

  // Every hook above must stay unconditional (Rules of Hooks): the early
  // return below only switches the rendered tree while fonts load.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.deep }} />;
  }

  return (
    <ThemeProvider>
      <LearnerProvider>
        <SafeAreaProvider>
          <ThemedApp />
        </SafeAreaProvider>
      </LearnerProvider>
    </ThemeProvider>
  );
}

// ThemedApp — the themed shell: adaptive status bar + branded stack headers.
function ThemedApp() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* OTA update banner: checks on mount and prompts the user to restart
          and apply a new bundle (published via `eas update`). */}
      <UpdateBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontFamily: fonts.display,
            fontWeight: "400",
            fontSize: 19,
          },
          contentStyle: { backgroundColor: colors.cream },
          // Light/dark toggle lives at the top of every stack screen.
          headerRight: () => <ThemeToggle />,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Log in" }} />
        <Stack.Screen
          name="onboarding"
          options={{ title: "Get started", headerBackVisible: false }}
        />
        <Stack.Screen
          name="home"
          options={{ title: "YK-Virtual", headerBackVisible: false }}
        />
        {/* A-24: register the LMS screens so they get proper titles instead of
            the raw route name ("lms/[cohortId]") in the native header. */}
        <Stack.Screen name="lms" options={{ title: "My Learning" }} />
        <Stack.Screen name="lms/[cohortId]" options={{ title: "Course" }} />
        <Stack.Screen name="chat" options={{ title: "Chat with YK-Virtual" }} />
        <Stack.Screen name="quizzes" options={{ title: "Quizzes" }} />
        <Stack.Screen
          name="quizzes/[assessmentId]"
          options={{ title: "Quiz" }}
        />
        <Stack.Screen name="progress" options={{ title: "Progress" }} />
        <Stack.Screen
          name="notifications"
          options={{ title: "Notifications" }}
        />
        <Stack.Screen name="account" options={{ title: "Account" }} />
        <Stack.Screen
          name="wizard"
          options={{ title: "Welcome", headerBackVisible: false }}
        />
        <Stack.Screen
          name="wizard/profile"
          options={{ title: "Profile", headerBackVisible: false }}
        />
        <Stack.Screen
          name="wizard/goals"
          options={{ title: "Goals", headerBackVisible: false }}
        />
        <Stack.Screen name="recommendations" options={{ title: "For you" }} />
        <Stack.Screen name="subjects" options={{ title: "Subjects" }} />
        <Stack.Screen name="subjects/[slug]" options={{ title: "Subject" }} />
        <Stack.Screen
          name="exam-prep"
          options={{ title: "Exam preparation" }}
        />
        <Stack.Screen
          name="exam-prep/[exam]/[subject]"
          options={{ title: "Exam subject" }}
        />
        <Stack.Screen name="search" options={{ title: "Find a tutor" }} />
        <Stack.Screen name="saved" options={{ title: "Saved tutors" }} />
        <Stack.Screen name="tutors/[slug]" options={{ title: "Tutor" }} />
        <Stack.Screen
          name="tutor-reviews/[slug]"
          options={{ title: "Reviews" }}
        />
        <Stack.Screen
          name="programmes/[slug]"
          options={{ title: "Programme" }}
        />
        <Stack.Screen name="cohorts/[id]" options={{ title: "Cohort" }} />
        <Stack.Screen name="tutor/index" options={{ title: "Tutor hub" }} />
        <Stack.Screen name="tutor/earnings" options={{ title: "Earnings" }} />
        <Stack.Screen name="tutor/lessons" options={{ title: "My lessons" }} />
        <Stack.Screen name="tutor/schedule" options={{ title: "Schedule" }} />
        <Stack.Screen name="tutor/messages" options={{ title: "Messages" }} />
        <Stack.Screen
          name="tutor/messages/[conversationId]"
          options={{ title: "Conversation" }}
        />
        <Stack.Screen
          name="tutor/profile"
          options={{ title: "Tutor profile" }}
        />
        <Stack.Screen
          name="tutor/availability"
          options={{ title: "Availability" }}
        />
        <Stack.Screen name="tutor/bank" options={{ title: "Bank details" }} />
        {/* Practice exams (CBT) — student hub/player + tutor authoring console */}
        <Stack.Screen name="practice" options={{ title: "Practice exams" }} />
        <Stack.Screen
          name="practice/[examId]"
          options={{ title: "Practice", headerBackVisible: true }}
        />
        <Stack.Screen name="tutor/exams" options={{ title: "My exams" }} />
        <Stack.Screen name="tutor/exams/new" options={{ title: "New exam" }} />
        <Stack.Screen
          name="tutor/exams/[examId]"
          options={{ title: "Exam results" }}
        />
        {/* Admin console (read-only operations overview; super admin gets the
            email test) */}
        <Stack.Screen name="admin/index" options={{ title: "Operations" }} />
        <Stack.Screen
          name="forgot-password"
          options={{ title: "Forgot password" }}
        />
        <Stack.Screen
          name="reset-password"
          options={{ title: "Reset password" }}
        />
        <Stack.Screen name="verify-email" options={{ title: "Verify email" }} />
        <Stack.Screen name="edit-profile" options={{ title: "Edit profile" }} />
        <Stack.Screen name="learners" options={{ title: "Learners" }} />
        <Stack.Screen name="referrals" options={{ title: "Referrals" }} />
        <Stack.Screen name="payments" options={{ title: "Payments" }} />
        <Stack.Screen name="about" options={{ title: "About YK-Virtual" }} />
        <Stack.Screen name="help" options={{ title: "Help" }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy" }} />
        <Stack.Screen name="terms" options={{ title: "Terms" }} />
        <Stack.Screen
          name="become-tutor"
          options={{ title: "Become a tutor" }}
        />
        <Stack.Screen name="pricing" options={{ title: "Pricing" }} />
        <Stack.Screen name="careers" options={{ title: "Careers" }} />
        <Stack.Screen name="contact" options={{ title: "Contact & Support" }} />
        <Stack.Screen name="offline" options={{ title: "Offline" }} />
        <Stack.Screen name="messages" options={{ title: "Messages" }} />
        <Stack.Screen
          name="messages/[conversationId]"
          options={{ title: "Conversation" }}
        />
        <Stack.Screen name="my-lessons" options={{ title: "My lessons" }} />
        <Stack.Screen
          name="lesson-notes/[lessonId]"
          options={{ title: "Lesson notes" }}
        />
        <Stack.Screen name="orders/[orderId]" options={{ title: "Receipt" }} />
        <Stack.Screen name="devices" options={{ title: "Devices" }} />
        <Stack.Screen
          name="learning-progress"
          options={{ title: "Lesson progress" }}
        />
      </Stack>
    </>
  );
}
