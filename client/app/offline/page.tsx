import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Offline",
  description: "You're offline.",
  path: "/offline",
  noIndex: true,
});

export default function OfflinePage() {
  return (
    <main className="container-x py-24 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-2xl font-extrabold mt-4">You&apos;re offline</h1>
      <p className="text-ink-500 mt-2">
        Check your connection and try again. Bookings, payments and messages need a live connection.
      </p>
    </main>
  );
}
