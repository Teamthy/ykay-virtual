import Link from "next/link";
import { Logo } from "./Logo";

// NUVORA footer — rebuilt on the PrebuiltUI footer template:
// Geist type, dark rounded-top card, 3-col brand column + link columns,
// social row, copyright bar, oversized brand watermark.

const PRODUCTS = [
  { href: "/cohorts", label: "Group Cohorts" },
  { href: "/private-tuition", label: "Private Tuition" },
  { href: "/online-classes", label: "Online Classes" },
  { href: "/utme-2026", label: "UTME 2026 Prep" },
  { href: "/nuvora-plus", label: "NUVORA Plus" },
];

const RESOURCES = [
  { href: "/resources", label: "Study Guides" },
  { href: "/blog", label: "Blog" },
  { href: "/test-prep", label: "Test Prep" },
  { href: "/study-abroad", label: "Study Abroad" },
  { href: "/download", label: "Android App" },
];

const COMPANY = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/success-stories", label: "Success Stories" },
  { href: "/become-tutor", label: "Become a Tutor" },
  { href: "/careers", label: "Careers" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/contact", label: "Contact Us" },
];

const SOCIALS = [
  {
    name: "X",
    path: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  },
  {
    name: "GitHub",
    path: "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4M9 18c-4.51 2-5-2-7-2",
  },
  {
    name: "LinkedIn",
    path: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
  },
  {
    name: "YouTube",
    path: "M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17m7.5-3 5-3-5-3z",
  },
  {
    name: "Instagram",
    path: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
  },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="hover:text-white">
        {label}
      </Link>
    </li>
  );
}

export function Footer() {
  return (
    <div className="bg-black px-4 pt-20">
      <footer className="mx-auto w-full max-w-[1350px] overflow-hidden rounded-tl-3xl rounded-tr-3xl bg-[#131314] px-4 pb-8 pt-8 text-white sm:px-8 md:px-16 lg:px-28 lg:pt-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:gap-12 lg:grid-cols-6">
          {/* Brand */}
          <div className="space-y-6 lg:col-span-3">
            <Link href="/" aria-label="NUVORA home">
              <Logo dark className="text-2xl" />
            </Link>
            <p className="max-w-96 text-sm/6 text-neutral-300">
              Africa&apos;s trusted tutoring platform — British &amp; Nigerian curricula, exam
              preparation, private tuition and live cohorts. Learning beyond boundaries.
            </p>
            <div className="flex gap-5 md:gap-6">
              {SOCIALS.map((s) => (
                <a
                  key={s.name}
                  href="/contact"
                  aria-label={s.name}
                  className="text-white hover:text-neutral-400"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 items-start gap-8 md:grid-cols-3 md:gap-12 lg:col-span-3 lg:gap-16">
            <div>
              <h3 className="mb-4 text-sm font-medium">Products</h3>
              <ul className="space-y-3 text-sm text-neutral-300">
                {PRODUCTS.map((l) => <FooterLink key={l.href} {...l} />)}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-medium">Resources</h3>
              <ul className="space-y-3 text-sm text-neutral-300">
                {RESOURCES.map((l) => <FooterLink key={l.href} {...l} />)}
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h3 className="mb-4 text-sm font-medium">Company</h3>
              <ul className="space-y-3 text-sm text-neutral-300">
                {COMPANY.map((l) => <FooterLink key={l.href} {...l} />)}
              </ul>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-2 border-t border-neutral-700 pt-4 sm:flex-row">
          <p className="text-sm text-neutral-400">© 2026 NUVORA</p>
          <p className="text-sm text-neutral-400">All rights reserved.</p>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-full max-h-64 w-full max-w-3xl rounded-full bg-brand-gold/40 blur-[170px]" />
          <h3 className="mt-6 text-center font-extrabold leading-[0.7] text-transparent [-webkit-text-stroke:1px_#3d3d3e] text-[clamp(3rem,15vw,15rem)]">
            NUVORA
          </h3>
        </div>
      </footer>
    </div>
  );
}
