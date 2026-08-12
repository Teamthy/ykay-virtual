import { redirect } from "next/navigation";

// Create account now lives in the stateful onboarding flow
// (/onboarding step 1: name + email). Keeping this route as a redirect so
// old links/bookmarks keep working.
export default function RegisterPage() {
  redirect("/onboarding");
}
