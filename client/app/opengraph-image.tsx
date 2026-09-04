import { brandCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const alt = "YK-Virtual — learn online anywhere";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OgImage() {
  return brandCard({
    eyebrow: "Ykay family · Online",
    title: "LEARN ANYWHERE.",
    subtitle: "Live classes · 1-on-1 tuition · UTME / WAEC / IELTS prep",
    footer: "virtual.ykaycollege.com",
  });
}
