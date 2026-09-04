// Apple touch startup images (PWA splash screens) for standalone iOS launches.
//
// iOS shows a plain white screen when a home-screen web app starts unless the
// page declares apple-touch-startup-image links — one per device resolution,
// selected by media query. Images live in public/splash and were generated
// from the brand mark on the deep-green background.
//
// Server component: renders <link> tags only, zero JS.

type Splash = { file: string; w: number; h: number; ratio: number };

// device-width / -webkit-device-pixel-ratio pairs for each image.
const SPLASHES: Splash[] = [
  { file: "splash-se-750x1334.png", w: 375, h: 667, ratio: 2 },
  { file: "splash-xr-828x1792.png", w: 414, h: 896, ratio: 2 },
  { file: "splash-x-1125x2436.png", w: 375, h: 812, ratio: 3 },
  { file: "splash-12-1170x2532.png", w: 390, h: 844, ratio: 3 },
  { file: "splash-max-1284x2778.png", w: 428, h: 926, ratio: 3 },
  { file: "splash-14pro-1179x2556.png", w: 393, h: 852, ratio: 3 },
  { file: "splash-promax-1290x2796.png", w: 430, h: 932, ratio: 3 },
  { file: "splash-plus-1242x2688.png", w: 414, h: 896, ratio: 3 },
];

function mediaFor(s: Splash) {
  return [
    `(device-width: ${s.w}px)`,
    `(device-height: ${s.h}px)`,
    `(-webkit-device-pixel-ratio: ${s.ratio})`,
  ].join(" and ");
}

export function AppleSplash() {
  return (
    <>
      {SPLASHES.map((s) => (
        <link
          key={s.file}
          rel="apple-touch-startup-image"
          href={`/splash/${s.file}`}
          media={mediaFor(s)}
        />
      ))}
    </>
  );
}
