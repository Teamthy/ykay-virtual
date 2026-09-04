import { brandCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "Two schools, one family — YK-Virtual and Ykay College";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return brandCard({
    eyebrow: "The Ykay family",
    title: "TWO SCHOOLS. ONE FAMILY.",
    subtitle: "Learn online with YK-Virtual, or on campus with Ykay College",
    footer: "virtual.ykaycollege.com/college",
  });
}
