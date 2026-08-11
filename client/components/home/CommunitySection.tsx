import { tutorImages, tutorPositions, featuredTutor, stats } from "@/lib/site-data";

export function CommunitySection() {
  return (
    <section className="py-24 md:py-28 bg-white text-center relative overflow-hidden">
      <div className="container-x relative">
        {/* Decorative math illustrations */}
        <svg className="hidden lg:block absolute left-[4%] top-[22%] w-[130px] h-[130px] opacity-50 pointer-events-none" viewBox="0 0 130 130">
          <circle cx="45" cy="45" r="32" fill="none" stroke="#c94b7d" strokeWidth="1.5"/>
          <circle cx="80" cy="45" r="32" fill="none" stroke="#c94b7d" strokeWidth="1.5"/>
          <circle cx="62" cy="80" r="32" fill="none" stroke="#c94b7d" strokeWidth="1.5"/>
          <text x="34" y="48" fill="#c94b7d" fontSize="11" fontStyle="italic">A</text>
          <text x="85" y="48" fill="#c94b7d" fontSize="11" fontStyle="italic">B</text>
          <text x="60" y="100" fill="#c94b7d" fontSize="11" fontStyle="italic">C</text>
        </svg>
        <svg className="hidden lg:block absolute right-[5%] top-[26%] w-[150px] h-[150px] opacity-55 pointer-events-none" viewBox="0 0 150 150">
          <polygon points="75,20 20,120 130,120" fill="none" stroke="#7dd3fc" strokeWidth="1.5"/>
          <text x="72" y="18" fill="#7dd3fc" fontSize="10">A</text>
          <text x="65" y="90" fill="#7dd3fc" fontSize="10" fontStyle="italic">8</text>
          <text x="72" y="135" fill="#7dd3fc" fontSize="9" fontStyle="italic">10</text>
          <text x="35" y="148" fill="#7dd3fc" fontSize="12" fontStyle="italic">c² = a² + b²</text>
        </svg>
        <svg className="hidden lg:block absolute left-[7%] top-[70%] w-[110px] h-[110px] opacity-50 pointer-events-none" viewBox="0 0 110 110">
          <polygon points="55,10 25,90 85,90" fill="none" stroke="#c9a0dc" strokeWidth="1.5" strokeDasharray="3,3"/>
          <ellipse cx="55" cy="90" rx="30" ry="8" fill="none" stroke="#c9a0dc" strokeWidth="1.5"/>
          <line x1="55" y1="10" x2="55" y2="90" stroke="#c9a0dc" strokeWidth="1" strokeDasharray="2,2"/>
        </svg>

        <h2 className="text-3xl md:text-5xl font-extrabold text-ink-800 leading-tight tracking-tight mb-11 max-w-[900px] mx-auto">
          Learn from a governed network<br className="hidden md:block" />
          of professional educators<br className="hidden md:block" />
          across Nigeria & beyond
        </h2>

        <div className="inline-flex flex-col md:flex-row bg-ink-800 text-white px-8 md:px-14 py-8 rounded-2xl gap-8 md:gap-16 mb-20 shadow-hero">
          {stats.map((s) => (
            <div key={s.label} className="text-left">
              <div className="text-4xl font-extrabold text-[#7dd3fc] leading-none mb-1">{s.num}</div>
              <div className="text-sm opacity-85">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tutor collage with phone */}
        <div className="relative h-[400px] md:h-[560px] max-w-[1200px] mx-auto mt-10">
          {tutorPositions.map((pos, i) => (
            <div
              key={i}
              className="absolute rounded-full overflow-hidden border-[3px] border-white shadow-card"
              style={{
                ...pos,
                width: pos.size,
                height: pos.size,
              }}
            >
              <img src={tutorImages[i]} alt="tutor" className="w-full h-full object-cover" />
            </div>
          ))}

          {/* Phone mockup */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] md:w-[290px] h-[400px] md:h-[520px] bg-[#1a1a1a] rounded-[44px] p-3 z-10 shadow-[0_40px_100px_rgba(0,0,0,0.35)] ring-2 ring-[#2a2a2a]">
            <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-[110px] h-[22px] bg-black rounded-[14px] z-20" />
            <div
              className="w-full h-full rounded-[34px] relative overflow-hidden bg-cover bg-center"
              style={{ backgroundImage: `url(${featuredTutor.photo})` }}
            >
              <div className="absolute bottom-0 left-0 right-0 pt-20 px-5 pb-6 text-white bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-xl md:text-2xl font-extrabold">{featuredTutor.name}</span>
                  <span className="bg-[#34c759]/95 text-white text-[10px] px-2.5 py-0.5 rounded-full font-semibold">✓ Verified</span>
                  <span className="ml-auto text-lg md:text-xl">{featuredTutor.country}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm mb-3">
                  <span className="text-brand-gold">★★★★★</span>
                  <strong>{featuredTutor.rating}</strong>
                  <span className="opacity-80">({featuredTutor.reviews} reviews)</span>
                </div>
                <div className="text-[11px] md:text-xs opacity-90 leading-relaxed space-y-1">
                  <div>👤 Completed {featuredTutor.hours} hours with {featuredTutor.students} students.</div>
                  <div>🎓 {featuredTutor.qualification}</div>
                  <div>📚 {featuredTutor.teaches}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}