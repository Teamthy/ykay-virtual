# NUVORA Mobile — Local Distribution (no Play Store / App Store)

We are NOT listing on Google Play or the Apple App Store. Users install the app
directly from the download page (`/download`) and get updates over-the-air.

---

## Why this works

1. **Direct APK install (Android)** — we build an Android APK and host it. Users
   tap "Download APK" and install it (with the "Install unknown apps" prompt).
   No Play Store required.

2. **Over-the-air updates (no re-download)** — the app is built with **EAS
   Update** (`expo-updates`). When you publish a new JS bundle with `eas update`,
   every installed copy fetches and applies it automatically on next launch.
   Users **never re-download** for new features or bug fixes.

3. **iOS** — direct `.ipa` install is NOT possible on iPhone without Apple's
   approval (App Store or TestFlight). Options:
   - **TestFlight** (internal testing, not publicly "listed") — needs a paid
     Apple Developer account.
   - **Web app** (fully supported) for iOS users meanwhile.
   We default to the web app for iOS and note it on the download page.

---

## Build the Android APK (one-time + on version bumps)

```bash
cd mobile
# 1. Log in once
eas login

# 2. Build a downloadable APK (not a Play bundle). This embeds EAS Update so
#    OTA updates work. The preview profile outputs an .apk.
npx eas build -p android --profile preview

# 3. Download the APK artifact and host it anywhere (Vercel public, R2, S3,
#    GitHub Releases, Drive).
```

Then point the download page at it:

```bash
# on the web host (Vercel env var) — or drop the file at client/public/nuvora-app.apk
NEXT_PUBLIC_APK_URL=https://your-host.com/nuvora-app.apk
```

---

## Publish an update (users get it without reinstalling)

```bash
cd mobile
npx eas update --channel preview --message "feat: quiz analytics"
```

That's it. Installed APKs check for updates on launch (configured
`checkAutomatically: ON_LOAD`) and apply them automatically.

> Native-only changes (adding a new native module) DO require a new APK build +
> `eas build`. Pure JS/TS feature changes ship via `eas update` with no reinstall.

---

## Versioning
- `mobile/package.json` `version` — bump on significant releases.
- `eas.json` uses `autoIncrement` on preview/production builds.
- The download page reads `NEXT_PUBLIC_APK_URL` so you never hardcode a URL.

---

## Security note
Direct-APK distribution means users must trust the source. Keep the APK on a
host you control (not a random file host), and consider signing the release so
Android's "Play Protect" doesn't warn. iOS users should use the web app or
TestFlight.
