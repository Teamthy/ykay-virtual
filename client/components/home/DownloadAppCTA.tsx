import Link from "next/link";

// Download the app section — reworked to match the PrebuiltUI app-download
// template (gradient-grid background, Poppins type, Apple/Google store buttons,
// avatar social-proof row). Previously a navy CSS-phone-mockup card; now the
// consistent "NUVORA on the go" template used on /download too.

const GRADIENT_BG =
  "url('https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/hero/gradient-bg-with-grid.png')";

const AVATARS = [
  "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&h=200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=60",
  "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&auto=format&fit=crop&q=60",
];

export function DownloadAppCTA() {
  return (
    <section className="relative overflow-hidden bg-cover bg-center bg-no-repeat font-poppins text-slate-800">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: GRADIENT_BG }}
        aria-hidden
      />
      <div className="container-x flex flex-col-reverse gap-12 py-20 md:py-28 lg:flex-row lg:items-center">
        {/* Copy + store buttons + social proof */}
        <div className="max-w-xl lg:pr-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            NUVORA on the go
          </p>
          <h2 className="mt-4 text-4xl font-semibold text-slate-900 md:text-6xl/[76px]">
            Your classroom, in your pocket.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-slate-600 md:text-base">
            Attend live lessons, take quizzes, submit assignments and track progress from your
            phone — even offline.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <Link href="/download" download aria-label="Download the Android APK">
              <img
                className="w-40 rounded-lg transition hover:opacity-90 md:w-44"
                src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/appDownload/googlePlayBtn.svg"
                alt="Get it on Google Play"
              />
            </Link>
            <button
              type="button"
              aria-label="Apple App Store (coming soon)"
              className="opacity-60 transition hover:opacity-80"
              title="App Store listing coming soon — use the Android APK for now."
            >
              <img
                className="w-40 rounded-lg md:w-44"
                src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/appDownload/appleStoreBtn.svg"
                alt="Download on the App Store"
              />
            </button>
          </div>

          <div className="mt-9 flex items-center gap-4">
            <div className="flex -space-x-3.5 pr-3">
              {AVATARS.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="size-10 rounded-full border-2 border-white transition hover:-translate-y-px"
                  style={{ zIndex: i + 1 }}
                />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-px">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="13" height="12" viewBox="0 0 13 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.85536 0.463527C6.00504 0.00287118 6.65674 0.00287028 6.80642 0.463526L7.82681 3.60397C7.89375 3.80998 8.08572 3.94946 8.30234 3.94946H11.6044C12.0888 3.94946 12.2901 4.56926 11.8983 4.85397L9.22687 6.79486C9.05162 6.92219 8.97829 7.14787 9.04523 7.35388L10.0656 10.4943C10.2153 10.955 9.68806 11.338 9.2962 11.0533L6.62478 9.11244C6.44954 8.98512 6.21224 8.98512 6.037 9.11244L3.36558 11.0533C2.97372 11.338 2.44648 10.955 2.59616 10.4943L3.61655 7.35388C3.68349 7.14787 3.61016 6.92219 3.43491 6.79486L0.763497 4.85397C0.37164 4.56927 0.573027 3.94946 1.05739 3.94946H4.35944C4.57606 3.94946 4.76803 3.80998 4.83497 3.60397L5.85536 0.463527Z" fill="#FF8F20" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-slate-500">Loved by 1,000+ learners</p>
            </div>
          </div>
        </div>

        {/* African student image */}
        <div className="mx-auto w-full max-w-[420px] lg:max-w-md">
          <img
            src="/hero/african-student.png"
            alt="African student with her school bag, learning on the NUVORA app"
            className="w-full rounded-3xl object-cover shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
