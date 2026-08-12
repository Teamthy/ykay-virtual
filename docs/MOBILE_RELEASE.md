# NUVORA Mobile — Store Release Runbook (M5)

Covers EAS builds, TestFlight, Play Console and the production checklist for
`mobile/` (Expo SDK 51 + expo-router).

---

## 0. Prerequisites

```bash
cd mobile
npm install
npx expo-doctor          # catches config/dependency issues
```

- EAS CLI: `npm i -g eas-cli`
- Log in to Expo: `eas login` (needs a project at https://expo.dev — create
  one and set `extra.projectId` in `app.json` to its ID).
- **Apple**: paid Developer account (US$99/yr), App Store Connect access.
- **Google**: Play Console account (US$25 one-time), org verified.

## 1. Build the binaries

```bash
eas build --platform ios --profile production     # → TestFlight (or adhoc)
eas build --platform android --profile production # → Play internal track
```

If you don't have a Mac, use EAS **managed credentials**:
`eas credentials` will generate/upload signing certificates for you
(Apple Distribution cert + provisioning, Android keystore). Keep the
keystore password safe — it cannot be recovered later.

## 2. iOS — App Store Connect (TestFlight)

1. `eas build:run` or upload via `eas submit --platform ios` (Xcode not needed).
2. In App Store Connect → **TestFlight**: the build appears after processing
   (10–30 min). Add internal testers (up to 100) under **Internal Testing**.
3. Fill the app record: name **NUVORA**, subtitle
   "Tutors, programmes & live cohorts", category **Education**,
   privacy policy URL (see §4), support URL, copyright.
4. **Privacy answers** (App Privacy / Data Safety):
   - Contact info (name, email, phone) — used for account, support
   - User content (messages, submissions, chat) — used for features
   - Identifiers (push tokens) — used for notifications
   - Purchases — used for payment fraud prevention
   - NOT collected: precise location, health, browsing history.
5. External testing (up to 10,000) once the build passes Beta App Review.

## 3. Android — Play Console (internal → production)

1. `eas submit --platform android` to the **Internal testing** track;
   add testers (Google groups) and let them install via the opt-in link.
2. Create the store listing: title **NUVORA**, short description
   ("British & Nigerian curricula, exam prep, private tuition and live
   cohorts"), screenshots (phone ≥2, tablet optional), feature graphic
   (1024×500), icon (512), app category **Education**.
3. **Data safety form**: mirror the iOS answers above; state that data is
   encrypted in transit, users can request deletion.
4. **Content rating questionnaire**: Education; no user-generated content
   flag unless you enable public content — keep it accurate.
5. Roll out: Internal → **Closed testing** (14 days of testing counts toward
   the production policy window) → **Production** (staged rollout: 10% → 50%
   → 100%).

## 4. Required legal pages (live before store review)

- Privacy policy: https://app.nuvora.com/privacy  (shipped — see `client/app/(marketing)/privacy`)
- Terms: https://app.nuvora.com/terms
- Delete-account path: email privacy@nuvora.com from the registered address,
  or in-app (account settings — add in M5.1). Respond within 30 days.

## 5. Pre-launch checklist

- [ ] `npx expo-doctor` clean; `tsc --noEmit` clean
- [ ] API: `ALLOWED_ORIGINS` set for the web origin; CORS fail-closed ok
- [ ] API: `SITE_URL`, `PORT`, `DATABASE_URL` production values (config
      Validate() blocks dev defaults)
- [ ] Google OAuth creds configured (GOOGLE_CLIENT_ID/SECRET) if enabled
- [ ] Push: `EXPO_ACCESS_TOKEN` on the API; `extra.projectId` in app.json
- [ ] Chatbot: `GEMINI_API_KEY` + `CHATBOT_ENABLED=true` (or gracefully off)
- [ ] Payments: Paystack/Flutterwave **live** keys (test keys only for sandbox)
- [ ] Icon/splash verified on device (assets/icon.png, splash.png)
- [ ] TestFlight / internal testing: auth (cookie+code), onboarding, LMS,
      chat, push received on device
- [ ] Privacy + Terms URLs reachable from the store listing
- [ ] Backups configured + restore tested (postgres), alerting on

## 6. Versioning & updates

- Bump `version` in `app.json` and `package.json` per release
  (semver). EAS assigns build numbers automatically; set
  `ios.buildNumber` / `android.versionCode` for manual control.
- Rollbacks: EAS keeps previous builds; Play allows "pause rollout";
  TestFlight keeps old builds available for internal testers.

## 7. Troubleshooting

- **Push not arriving** → token must come from a device (not simulator);
  verify `extra.projectId`; check the API log for Expo errors.
- **Build fails on icons** → assets must be PNG; check `expo-doctor`.
- **TestFlight "missing compliance"** → export compliance: answer "uses
  encryption" (HTTPS/TLS) and select "exempt" (standard encryption).
- **Play internal install blocked** → add the tester's Google account to
  the tester group; link expires after 30 days.
