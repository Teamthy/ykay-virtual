import Link from "next/link";
import { Logo } from "./Logo";

// NUVORA footer - full-width dark band, white brand copy, three link columns
// and a copyright bar. No social icons (removed), no rounded inset card.

const PRODUCTS = [
  { href: "/cohorts", label: "Group Cohorts" },
  { href: "/private-tuition", label: "Private Tuition" },
  { href: "/online-classes", label: "Online Classes" },
  { href: "/utme-2026", label: "UTME 2026 Prep" },
  { href: "/nuvora-plus", label: "NUVORA Plus" },
];

const RESOURCES = [
  { href: "/help", label: "Help Center" },
  { href: "/resources", label: "Study Guides" },
  { href: "/blog", label: "Blog" },
  { href: "/test-prep", label: "Test Prep" },
  { href: "/gmat", label: "GMAT / GRE" },
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

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="text-white/70 transition hover:text-white">
        {label}
      </Link>
    </li>
  );
}

function Column({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-white">{title}</h3>
      <ul className="space-y-3 text-sm">
        {links.map((l) => (
          <FooterLink key={l.href} {...l} />
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="w-full bg-[#0A0A0A] text-white">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-14 md:px-10">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link href="/" aria-label="NUVORA home">
              <Logo dark className="text-2xl" />
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white">
              Africa&apos;s trusted tutoring platform - British &amp; Nigerian curricula, exam
              preparation, private tuition and live cohorts. Learning beyond boundaries.
            </p>
          </div>

          <Column title="Products" links={PRODUCTS} />
          <Column title="Resources" links={RESOURCES} />
          <Column title="Company" links={COMPANY} />
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-sm text-white/60">© 2026 NUVORA</p>
          <p className="text-sm text-white/60">All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
