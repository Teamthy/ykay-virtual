import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/layout/ChatWidget";
import { MobileNav } from "@/components/layout/MobileNav";
import { Providers } from "@/components/providers";
import { RegisterSW } from "@/components/register-sw";
import { Toaster } from "@/components/toaster";
import { organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default: "NUVORA — Learning beyond boundaries. British & Nigerian curricula, exam preparation, private tuition and live cohorts.",
    template: "%s | NUVORA",
  },
  description: "British & Nigerian curriculum learning, examination preparation and expert private tuition online.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://nuvora.com"),
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgLd = organizationJsonLd();
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      </head>
      <body>
        <Providers>
          <Header />
          <main className="pb-16 lg:pb-0">{children}</main>
          <Footer />
          <ChatWidget />
          <MobileNav />
          <RegisterSW />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
