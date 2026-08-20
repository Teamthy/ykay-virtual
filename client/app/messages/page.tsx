import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { MessageCenter } from "@/features/messaging/components/MessageCenter";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const metadata: Metadata = buildMetadata({
  title: "Messages",
  description: "Booking-scoped conversations with your tutors and cohort peers.",
  path: "/messages",
  noIndex: true,
});

export default function MessagesPage() {
  return (
    <DashboardPage
      title="Community"
      subtitle="Parents, students and tutors share booking-scoped threads. Admins pick up escalations in Chat agent inbox and Support."
    >
      <MessageCenter />
    </DashboardPage>
  );
}
