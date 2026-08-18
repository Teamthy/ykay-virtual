import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { MessageCenter } from "@/features/messaging/components/MessageCenter";


export const metadata: Metadata = buildMetadata({
  title: "Messages",
  description: "Booking-scoped conversations with your tutors and cohort peers.",
  path: "/messages",
  noIndex: true,
});

export default function MessagesPage() {
  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold">Messages</h1>
        <p className="text-ink-500 text-sm mt-1">
          Conversations are scoped to your bookings — tutors, parents and cohort members only.
        </p>
      </div>
      <MessageCenter />
    </main>

  );
}
