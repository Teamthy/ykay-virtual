import { ChevronRight } from "lucide-react";

export function BecomeTutorCTA() {
  return (
    <section className="py-20 md:py-24 bg-surface-muted">
      <div className="container-x">
        <div className="bg-brand-blue rounded-3xl px-8 md:px-16 py-20 md:py-24 relative overflow-hidden min-h-[420px] flex items-center justify-center shadow-brand">
          <div className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.05) 2px, transparent 2px)",
              backgroundSize: "80px 80px"
            }}
          />
          <div
            className="hidden lg:block absolute top-1/2 -translate-y-1/2 left-20 w-72 h-96 bg-cover bg-center rounded-xl"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=500&q=85')" }}
          />
          <div
            className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-20 w-72 h-96 bg-cover bg-center rounded-xl"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&q=85')" }}
          />
          <div className="relative z-10 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-9">
              Become a tutor and<br />earn money teaching<br />what you love
            </h2>
            <button className="btn-outline-white">
              Apply to Teach <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}