import "./globals.css";
import type { Metadata } from "next";
import { Anton, DM_Sans } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/layout/ChatWidget";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { SkipLink } from "@/components/layout/SkipLink";
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
  openGraph: {
    type: "website",
    siteName: "NUVORA",
    title: "NUVORA — Learning beyond boundaries",
    description: "British & Nigerian curricula · Exam preparation · Private tuition · Live cohorts.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "NUVORA — Learning beyond boundaries" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NUVORA — Learning beyond boundaries",
    description: "British & Nigerian curricula · Exam preparation · Private tuition · Live cohorts.",
    images: ["/og.png"],
  },
  // PWA (M1 hardening): installable on Android/iOS.
  manifest: "/manifest.json",
  icons: [{ rel: "apple-touch-icon", url: "/icons/icon-192.png", sizes: "192x192" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NUVORA",
  },
  other: {
    "theme-color": "#0A1F44",
    "mobile-web-app-capable": "yes",
  },
};

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgLd = organizationJsonLd();
  return (
    <html lang="en" className={`${anton.variable} ${dmSans.variable}`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      </head>
      <body>
        <Providers>
          <Header />
          <main id="main-content" tabIndex={-1} className="pb-16 outline-none lg:pb-0">{children}</main>
          <Footer />
          <ChatWidget />
          <InstallPrompt />
          <CookieConsent />
          <SkipLink />
          <MobileNav />
          <RegisterSW />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
