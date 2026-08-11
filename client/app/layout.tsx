import "./globals.css";
import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/layout/ChatWidget";
import { Providers } from "@/components/providers";
import { organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default: "YKAY Virtual School — Expert teaching. Structured learning. Anywhere.",
    template: "%s | YKAY Virtual School",
  },
  description: "British & Nigerian curriculum learning, examination preparation and expert private tuition online.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ykayvirtual.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgLd = organizationJsonLd();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Caveat:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      </head>
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
