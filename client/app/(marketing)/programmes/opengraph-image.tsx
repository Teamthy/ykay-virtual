import { brandCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "YK-Virtual programmes — cohorts, tuition and exam prep";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return brandCard({
    eyebrow: "Programmes",
    title: "FIND YOUR PROGRAMME.",
    subtitle: "Cohorts · Private tuition · Digital skills",
    footer: "virtual.ykaycollege.com/programmes",
  });
}
