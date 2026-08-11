import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#12121e] text-white pt-20 pb-8">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-14 mb-14">
          <div>
            <div className="flex items-center gap-2 text-2xl font-extrabold mb-5">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#1a4fd4">
                <path d="M4 4h12a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H4V4zm2 2v16h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6z"/>
              </svg>
              ykay
            </div>
            <p className="text-sm text-white/65 leading-relaxed mb-6 max-w-xs">
              Expert teaching. Structured learning. Anywhere. British and Nigerian curriculum, examination preparation and expert private tuition online.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} className="w-10 h-10 bg-white/8 rounded-full flex items-center justify-center hover:bg-brand-blue hover:-translate-y-0.5 transition-all cursor-pointer">
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>
          <FooterCol title="Programmes" links={["British Curriculum", "Nigerian Curriculum", "Exam Preparation", "Private Tuition", "Digital Skills"]} />
          <FooterCol title="Company" links={["About Us", "Academic Leadership", "Success Stories", "Blog", "Careers"]} />
          <FooterCol title="Support" links={["Help Centre", "FAQ", "Contact", "Safeguarding", "Terms & Privacy"]} />
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-3 text-xs text-white/55">
          <span>© 2026 YKAY Virtual School. All rights reserved.</span>
          <span>Academically governed learning · Registered in Nigeria</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-bold mb-5">{title}</h4>
      <div className="space-y-3">
        {links.map((l) => (
          <a key={l} className="block text-sm text-white/65 hover:text-white transition-opacity cursor-pointer">{l}</a>
        ))}
      </div>
    </div>
  );
}