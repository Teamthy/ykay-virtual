import { Play } from "lucide-react";

// v2.tuteria.com announcement band: "Watch our announcement video" with the
// award/press recognition strip (Forbes, internet.org, BBC, ROYAL, Microsoft,
// Pitch@Palace, TEF — reference 003244).

const AWARDS = [
  "Forbes",
  "internet.org",
  "BBC",
  "ROYAL",
  "Microsoft",
  "Pitch@Palace",
  "TEF",
  "Academy of Engineering",
];

export function AnnouncementVideo() {
  return (
    <section className="border-t border-ink-100 bg-white py-16">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">
            Watch our announcement video
          </h2>
          <p className="mt-3 text-ink-600">
            NUVORA has received awards, support and media from these companies.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <a
            href="https://www.youtube.com/results?search_query=online+tutoring+nigeria"
            target="_blank"
            rel="noreferrer"
            className="group grid h-24 w-24 place-items-center rounded-full bg-[#111111] text-white shadow-card transition-transform hover:scale-105"
            aria-label="Watch the announcement video on YouTube"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-white/10 transition-colors group-hover:bg-white/20">
              <Play size={26} className="ml-1" fill="currentColor" />
            </span>
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {AWARDS.map((a) => (
            <span key={a} className="text-sm font-extrabold uppercase tracking-wide text-ink-300">
              {a}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
