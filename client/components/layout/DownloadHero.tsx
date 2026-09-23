import Image from "next/image";
import { WifiOff, Bell, FileCheck2, Smartphone } from "lucide-react";
import { qrUrl, requestOrigin } from "@/lib/qr";

// DownloadHero - on-brand download hero. The PWA IS the app: it installs from
// the browser on Android and iPhone, so the hero sells that instead of store
// badges. The QR encodes this page on the origin the visitor is actually on,
// so a parent on a laptop can scan it straight onto their phone.

const PERKS = [
  { icon: WifiOff, text: "Learn offline" },
  { icon: Bell, text: "Instant notifications" },
  { icon: FileCheck2, text: "Progress reports" },
];

export async function DownloadHero() {
  const qr = qrUrl(`${await requestOrigin()}/download`);

  return (
    <section className="w-full border-b border-black/10 bg-white py-14 md:py-20">
      <div className="container-x grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0F2A1A]">
            YK-Virtual mobile
          </p>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-[0.02em] text-[#0F2A1A] md:text-6xl">
            Download YK-Virtual on the go
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-[#0F2A1A]/70">
            Learn anywhere - tutors, live cohorts, quizzes, progress reports and
            the AI assistant in one app.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-6">
            <a
              href="#pwa-install"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D6FF57] px-6 py-3 text-sm font-bold text-[#0F2A1A] transition-transform hover:-translate-y-0.5"
            >
              <Smartphone size={18} />
              Install the app — free
            </a>

            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="QR code — scan to open this page on your phone"
                width={72}
                height={72}
                className="rounded-lg bg-white ring-1 ring-black/10"
              />
              <p className="max-w-[10rem] text-xs leading-snug text-[#0F2A1A]/70">
                Scan with your phone camera to install in seconds
              </p>
            </div>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-black/10 pt-6">
            {PERKS.map((p) => (
              <li
                key={p.text}
                className="flex items-center gap-2 text-sm font-semibold text-[#0F2A1A]/75"
              >
                <p.icon size={16} className="text-[#0F2A1A]" />
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <Image
            src="/hero/african-student.jpg"
            alt="African student learning on the YK-Virtual app"
            width={768}
            height={1376}
            sizes="(max-width: 768px) 90vw, 384px"
            priority={false}
            className="w-full rounded-3xl object-cover shadow-card ring-1 ring-black/10"
          />
        </div>
      </div>
    </section>
  );
}
