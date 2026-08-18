import { redirect } from "next/navigation";

/** Route kept so old links do not 404. Study-abroad marketing was removed. */
export default function StudyAbroadRemoved() {
  redirect("/gmat");
}
