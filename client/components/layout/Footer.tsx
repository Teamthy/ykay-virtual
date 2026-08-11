import Link from "next/link";

// Fully-wired footer: every column links to a real route.

const PROGRAMMES = [
  { href: "/cohorts", label: "Group Cohorts" },
  { href: "/curricula/british", label: "British Curriculum" },
  { href: "/curricula/nigerian", label: "Nigerian Curriculum" },
  { href: "/exam-prep", label: "Exam Preparation" },
  { href: "/private-tuition", label: "Private Tuition" },
  { href: "/digital-skills", label: "Digital Skills" },
];

const COMPANY = [
  { href: "/about", label: "About & Academic Leadership" },
  { href: "/resources", label: "Resources & Study Guides" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/success-stories", label: "Success Stories" },
  { href: "/blog", label: "Resources & Blog" },
  { href: "/careers", label: "Careers" },
];

const SUPPORT = [
  { href: "/contact", label: "Contact / Support" },
  { href: "/pricing", label: "Pricing" },
  { href: "/become-tutor", label: "Become a Tutor" },
  { href: "/for-schools", label: "For Schools" },
  { href: "/corporate-training", label: "Corporate Training" },
];

export function Footer() {
  return (
    <footer className="bg-[#12121e] text-white pt-20 pb-8 mt-16">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-14 mb-14">
          <div>
            <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold mb-5">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#1a4fd4">
                <path d="M4 4h12a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H4V4zm2 2v16h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6z"/>
              </svg>
              ykay
            </Link>
            <p className="text-sm text-white/65 leading-relaxed mb-6 max-w-xs">
              Expert teaching. Structured learning. Anywhere. British and Nigerian curriculum,
              examination preparation and expert private tuition online.
            </p>
            <div className="flex gap-3">
              {[socialIcon("facebook"), socialIcon("twitter"), socialIcon("instagram"), socialIcon("linkedin")].map((icon, i) => (
                <a key={i} href="/contact" aria-label={icon.label}
                  className="w-10 h-10 bg-white/8 rounded-full flex items-center justify-center hover:bg-brand-blue hover:-translate-y-0.5 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">{icon.paths}</svg>
                </a>
              ))}
            </div>
          </div>
          <FooterCol title="Programmes" links={PROGRAMMES} />
          <FooterCol title="Company" links={COMPANY} />
          <FooterCol title="Support" links={SUPPORT} />
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-3 text-xs text-white/55">
          <span>© 2026 YKAY Virtual School. All rights reserved.</span>
          <span className="flex gap-4">
            <Link href="/about" className="hover:text-white">Safeguarding</Link>
            <Link href="/contact" className="hover:text-white">Terms & Privacy</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-bold mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-white/65 hover:text-white transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function socialIcon(name: string) {
  const icons: Record<string, { label: string; paths: React.ReactNode }> = {
    facebook: { label: "Facebook", paths: <path d="M14 8h3V5h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" /> },
    twitter: { label: "Twitter", paths: <path d="M18.9 5.5c-.8.4-1.6.6-2.5.7a4.3 4.3 0 0 0-7.4 3.9A12.2 12.2 0 0 1 4 4.9a4.3 4.3 0 0 0 1.3 5.7 4.2 4.2 0 0 1-2-.5v.1c0 2 1.5 3.8 3.5 4.2a4.3 4.3 0 0 1-2 .1 4.3 4.3 0 0 0 4 3 8.7 8.7 0 0 1-5.4 1.9c-.3 0-.7 0-1-.1a12.3 12.3 0 0 0 6.6 2c8 0 12.3-6.6 12.3-12.3v-.6a8.7 8.7 0 0 0 2.2-2.3 8.6 8.6 0 0 1-2.5.7z" /> },
    instagram: { label: "Instagram", paths: <path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.8a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2zm4.9-8a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM21 7.6c0-1.5-.4-2.8-1.4-3.8S17.6 2.4 16 2.4h-8c-3.2 0-5.6 2.4-5.6 5.6v8c0 1.5.4 2.8 1.4 3.8s2.3 1.4 3.8 1.4h8c3.2 0 5.6-2.4 5.6-5.6v-8zM19 15.6c0 1-.3 1.7-.9 2.3s-1.3.9-2.3.9h-8c-2 0-3.4-1.4-3.4-3.4v-8c0-1 .3-1.7.9-2.3s1.3-.9 2.3-.9h8c2 0 3.4 1.4 3.4 3.4v8z" /> },
    linkedin: { label: "LinkedIn", paths: <path d="M6.5 8.8v10.7H3.2V8.8h3.3zM4.8 3.4a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8zM20.8 13.3v6.2h-3.3v-5.8c0-1.4-.5-2.4-1.8-2.4-1 0-1.6.7-1.8 1.3-.1.2-.1.6-.1.9v6h-3.3V8.8h3.3v1.5c.4-.7 1.2-1.6 2.9-1.6 2.1 0 4.1 1.4 4.1 4.6z" /> },
  };
  return icons[name] || { label: name, paths: <circle cx="12" cy="12" r="9" /> };
}
