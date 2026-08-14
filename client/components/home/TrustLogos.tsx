import { trustLogos } from "@/lib/site-data";

export function TrustLogos() {
  return (
    <section className="py-14 bg-white text-center">
      <div className="container-x">
        <p className="text-xs text-ink-500 uppercase tracking-[2px] font-semibold mb-8">
          Trusted educators. Recognised curricula. Vetted delivery.
        </p>
        <div className="flex justify-center items-center gap-14 flex-wrap grayscale opacity-55">
          {trustLogos.map((n) => (
            <span key={n} className="text-sm font-bold text-ink-700 uppercase tracking-wide">{n}</span>
          ))}
        </div>
      </div>
    </section>
  );
}