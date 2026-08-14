import { Check } from "lucide-react";

export function TestPrepCard() {
  return (
    <section className="py-24 md:py-28 bg-white">
      <div className="container-x">
        <div className="tag-handwritten text-brand-green mb-3" style={{ fontSize: "28px" }}>Test Prep</div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-ink-800 mb-11 tracking-tight">
          Get top grades in tests & examinations
        </h2>
        <div className="bg-brand-green-dark rounded-3xl p-10 md:p-16 text-white grid lg:grid-cols-2 gap-14 items-center relative overflow-hidden shadow-lift">
          <div className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.05) 2px, transparent 2px)",
              backgroundSize: "70px 70px"
            }}
          />
          <div className="relative z-10">
            <h3 className="text-2xl md:text-4xl font-extrabold leading-tight mb-6">
              Prepare for entrance examinations into top schools in Nigeria & the UK
            </h3>
            <p className="text-sm md:text-base leading-relaxed mb-7 opacity-95 max-w-[440px]">
              Get into schools like Loyola Jesuit, Grange, St. Saviours, Kings College UK, CIS and Federal Schools.
            </p>
            <div className="mb-9 space-y-3.5">
              {["95% success rate", "Rigorous practice & mock exams", "Covers entire syllabus"].map((f) => (
                <div key={f} className="flex items-center gap-3 text-sm md:text-base">
                  <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                    <Check size={10} strokeWidth={2.5} />
                  </div>
                  {f}
                </div>
              ))}
            </div>
            <button className="btn-white">Find out more</button>
          </div>

          <div className="bg-white/5 border border-white/20 rounded-2xl p-10 relative z-10">
            <div className="text-5xl md:text-6xl text-center mb-6 font-extrabold text-brand-gold font-serif">A⁺</div>
            {[["Math", "98%"], ["English", "89%"], ["Science", "92%"]].map(([s, v]) => (
              <div key={s} className="flex justify-between py-4 text-lg md:text-xl font-bold border-b border-white/15 last:border-0">
                <span>{s}</span><span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}