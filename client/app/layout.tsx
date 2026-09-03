import "./globals.css";
import type { Metadata } from "next";
import { Anton, DM_Sans, Poppins } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/layout/ChatWidget";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { SkipLink } from "@/components/layout/SkipLink";
import { MobileNav } from "@/components/layout/MobileNav";
import { ShellVisibility } from "@/components/layout/ShellVisibility";
import { HomeOnly } from "@/components/layout/HomeOnly";
import { Providers } from "@/components/providers";
import { RegisterSW } from "@/components/register-sw";
import { Toaster } from "@/components/toaster";
import { Analytics } from "@/components/layout/Analytics";
import { organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    default:
      "YK-Virtual - Learning beyond boundaries. British & Nigerian curricula, exam preparation, private tuition and live cohorts.",
    template: "%s | YK-Virtual",
  },
  description:
    "British & Nigerian curriculum learning, examination preparation and expert private tuition online.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://virtual.ykaycollege.com",
  ),
  openGraph: {
    type: "website",
    siteName: "YK-Virtual",
    title: "YK-Virtual - Learning beyond boundaries",
    description:
      "British & Nigerian curricula · Exam preparation · Private tuition · Live cohorts.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "YK-Virtual - Learning beyond boundaries",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YK-Virtual - Learning beyond boundaries",
    description:
      "British & Nigerian curricula · Exam preparation · Private tuition · Live cohorts.",
    images: ["/og.png"],
  },
  // PWA (M1 hardening): installable on Android/iOS.
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/brand/mark.png", type: "image/png" }],
    apple: [{ url: "/brand/mark.png", sizes: "512x512", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YK-Virtual",
  },
  other: {
    "theme-color": "#013920",
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

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgLd = organizationJsonLd();
  return (
    <html
      lang="en"
      className={`${anton.variable} ${dmSans.variable} ${poppins.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
        />
        {/* Analytics loads after hydration when (and only when)
            NEXT_PUBLIC_PLAUSIBLE_DOMAIN is configured. */}
        <Analytics />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          {/* Marketing chrome renders ONLY on public routes; dashboards use
              their own personalized DashboardShell (Batch 1). */}
          <ShellVisibility>
            <Header />
            <MobileNav />
          </ShellVisibility>
          <div
            id="main-content"
            tabIndex={-1}
            className="pb-16 outline-none lg:pb-0"
          >
            {children}
          </div>
          {/* Footer appears ONLY on the marketing home page; the floating
              AI assistant (moveable launcher) is available on EVERY page. */}
          <HomeOnly>
            <Footer />
          </HomeOnly>
          <ChatWidget />
          {/* WhatsApp live chat — floating button above the AI launcher;
              hides itself when WHATSAPP_BUSINESS_NUMBER is not configured. */}
          <div className="pointer-events-none fixed bottom-24 right-4 z-40 lg:right-6">
            <WhatsAppButton className="pointer-events-auto block" />
          </div>
          <ShellVisibility>
            {/* Consent + install banners are public-route chrome; on
                dashboards they overlay form buttons (wizard "Finish"). */}
            <InstallPrompt />
            <CookieConsent />
          </ShellVisibility>
          <SkipLink />
          <RegisterSW />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
