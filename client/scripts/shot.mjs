/* Dev-only visual QA harness (NOT part of the app build; not in devDeps).
 * Renders the homepage with a bundled Chromium and saves desktop/mobile
 * screenshots to ../shots for comparison against design references.
 *
 * Usage:
 *   npm i -D puppeteer-core @sparticuz/chromium   # one-time, optional
 *   node scripts/shot.mjs [url] [outprefix]
 *
 * On constrained hosts Chromium may need its bundled NSS libs:
 *   LD_LIBRARY_PATH=$(node -e 'console.log(require("@sparticuz/chromium").path ?? "/tmp")') node scripts/shot.mjs
 */
const url = process.argv[2] ?? "http://localhost:3000/";
const prefix = process.argv[3] ?? "home";

let chromium, puppeteer;
try {
  chromium = (await import("@sparticuz/chromium")).default;
  puppeteer = (await import("puppeteer-core")).default;
} catch {
  console.error(
    "This harness needs optional dev tools: npm i -D puppeteer-core @sparticuz/chromium",
  );
  process.exit(1);
}

const { mkdirSync } = await import("node:fs");
mkdirSync("../shots", { recursive: true });

const execPath = await chromium.executablePath();
const browser = await puppeteer.launch({
  args: [...chromium.args, "--force-device-scale-factor=1"],
  executablePath: execPath,
  headless: "shell",
  defaultViewport: { width: 1440, height: 900 },
});

try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  // let entrance animations settle
  await page.evaluate(() => document.fonts?.ready?.catch(() => {}));
  await new Promise((r) => setTimeout(r, 1800));

  await page.screenshot({ path: `../shots/${prefix}-desktop-hero.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
  await page.screenshot({ path: `../shots/${prefix}-desktop-tall.png`, clip: { x: 0, y: 0, width: 1440, height: 1500 } });
  await page.screenshot({ path: `../shots/${prefix}-desktop-full.png`, fullPage: true });

  const mobile = await browser.newPage();
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobile.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  await mobile.screenshot({ path: `../shots/${prefix}-mobile-hero.png` });
  console.log("saved shots");
} finally {
  await browser.close();
}
