import { partnerFeatures, kidImages } from "@/lib/site-data";
import { Check, Play } from "lucide-react";

export function PartnerSection() {
  return (
    <section className="py-24 md:py-28 bg-brand-navy text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.03) 2px, transparent 2px)",
          backgroundSize: "100px 100px"
        }}
      />
      <div className="container-x grid lg:grid-cols-2 gap-14 lg:gap-20 items-center relative">
        <div>
          <div className="tag-handwritten mb-5">We do home tutoring the right way.</div>
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight mb-7">
            Make YKAY your children&apos;s tutoring partner from cradle to ruling the world.
          </h2>
          <p className="text-base leading-relaxed mb-9 opacity-90 max-w-[560px]">
            We work with you to ensure your children excel at every stage of their learning journey whether it&apos;s building early foundations, helping with homework, getting better grades, mastering their subjects or passing pivotal exams.
          </p>
          <div className="mb-10">
            {partnerFeatures.map((f) => (
              <div key={f} className="flex items-center gap-3.5 mb-4 text-base">
                <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Check size={14} strokeWidth={2.5} />
                </div>
                {f}
              </div>
            ))}
          </div>
          <div className="flex gap-6 items-center flex-wrap">
            <button className="btn-primary">Get a professional tutor</button>
            <a className="flex items-center gap-3.5 text-sm font-semibold cursor-pointer group">
              <span className="w-12 h-12 rounded-full border-2 border-white/60 flex items-center justify-center group-hover:bg-white/15 group-hover:border-white transition-all">
                <Play size={14} fill="white" className="ml-0.5" />
              </span>
              Learn how<br />it works
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3.5 h-[400px] md:h-[520px]">
          {kidImages.map((k, i) => (
            <div
              key={i}
              className={`rounded-2xl bg-cover bg-center ${
                i === 0 ? "row-span-2" : ""
              }`}
              style={{ backgroundImage: `url(${k.url})` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}