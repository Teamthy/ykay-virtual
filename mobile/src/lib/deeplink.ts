import { router } from "expo-router";

// Deep-linking helper — maps a notification's `data` (a JSON string carrying a
// screen target + id) to an app route. Used when a notification is tapped in
// the app and when an Expo push notification response opens the app.

type Target = { screen?: string; id?: string; conversation_id?: string; cohort_id?: string; lesson_id?: string };

export function parseTarget(data?: string | Record<string, unknown> | null): Target {
  if (!data) return {};
  if (typeof data === "object") return data as Target;
  try {
    return JSON.parse(data) as Target;
  } catch {
    return {};
  }
}

export function routeForTarget(target: Target): string | null {
  if (target.screen) {
    // Explicit screen target wins (e.g. "conversation", "course", "receipt").
    switch (target.screen) {
      case "conversation":
        return target.conversation_id || target.id ? `/messages/${target.conversation_id || target.id}` : "/messages";
      case "course":
      case "cohort":
        return target.cohort_id ? `/lms/${target.cohort_id}` : "/lms";
      case "lesson":
        return target.lesson_id ? `/my-lessons` : "/my-lessons";
      case "receipt":
        return target.id ? `/orders/${target.id}` : "/payments";
      case "inbox":
        return "/messages";
      case "notifications":
        return "/notifications";
      default:
        return "/notifications";
    }
  }
  // Fallback by notification type fields.
  if (target.conversation_id) return `/messages/${target.conversation_id}`;
  if (target.cohort_id) return `/lms/${target.cohort_id}`;
  if (target.id) return `/orders/${target.id}`;
  return null;
}

export function openNotification(target: Target) {
  const route = routeForTarget(target);
  if (route) router.push(route as never);
}
