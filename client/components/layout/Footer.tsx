import Link from "next/link";
import { Logo } from "./Logo";
import { ArrowRight } from "lucide-react";

const PRODUCTS = [
  { href: "/cohorts", label: "Group Cohorts" },
  { href: "/private-tuition", label: "Private Tuition" },
  { href: "/online-classes", label: "Online Classes" },
  { href: "/utme-2026", label: "UTME 2026 Prep" },
  { href: "/exam-prep", label: "Exam Prep" },
  { href: "/plus", label: "YK-Virtual Plus" },
];

const RESOURCES = [
  { href: "/help", label: "Help Center" },
  { href: "/resources", label: "Study Guides" },
  { href: "/blog", label: "Blog" },
  { href: "/test-prep", label: "Test Prep" },
  { href: "/subjects", label: "Subjects" },
  { href: "/download", label: "Download App" },
];

const COMPANY = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/success-stories", label: "Success Stories" },
  { href: "/become-tutor", label: "Become a Tutor" },
  { href: "/college", label: "Ykay College" },
  { href: "/contact", label: "Contact Us" },
];

export function Footer() {
  return (
    <footer className="relative w-full overflow-hidden bg-[#0F2A1A]">
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-[1200px]">
          {/* white card like reference */}
          <div className="rounded-[20px] bg-white p-6 lg:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.15)]">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
              <div>
                <Link href="/" aria-label="YK-Virtual home" className="inline-flex items-center gap-2">
                  <Logo />
                </Link>
                <p className="mt-4 max-w-[36ch] text-[13px] leading-[1.6] text-[#0F2A1A]/70">
                  YK-Virtual is Africa&apos;s trusted tutoring platform — British & Nigerian curricula, exam preparation, private tuition and live cohorts. Learning beyond boundaries, powered by Ykay College.
                </p>
                <div className="mt-6">
                  <Link href="/become-tutor" className="inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-5 py-2.5 text-[12px] font-bold text-white hover:bg-black">
                    Apply to teach <span className="grid size-5 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><ArrowRight size={10} /></span>
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">Products</p>
                <ul className="mt-3 space-y-2">
                  {PRODUCTS.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[13px] text-[#0F2A1A]/70 hover:text-[#0F2A1A] hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">Resources</p>
                <ul className="mt-3 space-y-2">
                  {RESOURCES.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[13px] text-[#0F2A1A]/70 hover:text-[#0F2A1A] hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">Company</p>
                <ul className="mt-3 space-y-2">
                  {COMPANY.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[13px] text-[#0F2A1A]/70 hover:text-[#0F2A1A] hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-5">
              <p className="text-[11px] text-[#0F2A1A]/50">© 2026 YK-Virtual · British & Nigerian curricula · All rights reserved</p>
              <div className="flex gap-4 text-[11px] text-[#0F2A1A]/50">
                <Link href="/privacy" className="hover:text-[#0F2A1A] hover:underline">Privacy</Link>
                <Link href="/terms" className="hover:text-[#0F2A1A] hover:underline">Terms</Link>
                <Link href="/contact" className="hover:text-[#0F2A1A] hover:underline">Contact</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
