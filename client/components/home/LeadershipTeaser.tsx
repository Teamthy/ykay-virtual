import Link from "next/link";

// Academic leadership teaser (home §8.1) — founder profile preview.
export function LeadershipTeaser() {
  return (
    <section className="container-x py-16 md:py-20">
      <div className="rounded-3xl bg-[#12121e] text-white overflow-hidden grid lg:grid-cols-[0.85fr_1.15fr]">
        <div className="bg-gradient-to-br from-brand-blue to-blue-800 p-10 md:p-14 flex flex-col justify-center items-start min-h-[280px]">
          <p className="tag-handwritten">Academic leadership</p>
          <h2 className="text-3xl font-extrabold mt-2">Led by educators, not just platforms</h2>
          <Link href="/about" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white text-brand-blue font-bold text-sm px-6 py-3.5 hover:brightness-95 transition-all">
            Meet the academic leader
          </Link>
        </div>
        <div className="p-10 md:p-14">
          <p className="text-white/80 leading-relaxed">
            YKAY is led by an experienced educator and Computing leader whose career spans leading
            international schools in Nigeria — including preparing learners for IGCSE Computer
            Science with exceptional national outcomes and coaching students to international
            competition success.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-white/70">
            {[
              "BSc Computer Science · MSc Information Technology",
              "Fellow, COBIS Middle Leaders programme",
              "Led a medal-winning delegation at the 2026 International Coding Olympiad, Rome",
            ].map((t) => (
              <li key={t} className="flex gap-2"><span className="text-brand-gold font-bold">✓</span>{t}</li>
            ))}
          </ul>
          <div className="mt-6 flex gap-3 flex-wrap">
            <Link href="/about" className="text-sm font-semibold text-white hover:text-brand-gold transition-colors">About YKAY →</Link>
            <Link href="/digital-skills" className="text-sm font-semibold text-white hover:text-brand-gold transition-colors">Computing & digital skills →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
