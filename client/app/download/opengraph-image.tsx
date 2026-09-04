import { brandCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Install the YK-Virtual app on Android or iPhone";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return brandCard({
    eyebrow: "Get the app",
    title: "YOUR CLASSROOM, IN YOUR POCKET.",
    subtitle: "Install instantly from the website — Android & iPhone",
    footer: "virtual.ykaycollege.com/download",
  });
}
