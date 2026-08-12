# NUVORA — App Store & Play Store Submission Kit (M5)

Copy-paste content for the store listings + the forms you must fill.
Build the binaries first: `cd mobile && npx expo-doctor && eas build
--platform ios && eas build --platform android` (see MOBILE_RELEASE.md).

---

## App Store (iOS) — App Store Connect

### App information
| Field | Value |
|---|---|
| Name | NUVORA |
| Subtitle | Tutors, programmes & live cohorts |
| Category | Education |
| Primary language | English (UK) |
| Bundle ID | com.nuvora.app |
| Version | 0.1.0 (build number from EAS) |
| Price | Free |
| Region availability | All (start with Nigeria + UK + US) |
| App Review contact | support@nuvora.com |

### Description (iOS, ≤ 4000 chars)
```
NUVORA — Learning beyond boundaries.

Learn with vetted tutors across British and Nigerian curricula: live
cohorts, exam preparation (UTME, WAEC, IGCSE, SAT, IELTS, TOEFL, GMAT,
GRE) and private one-to-one tuition.

• Find a tutor by subject, level and schedule
• Join live cohort classes with lessons, quizzes and assignments
• Track attendance, grades and progress reports
• Pay securely — fees held in escrow until lessons are delivered
• Chat with our AI assistant 24/7, or talk to a human when you need one
• Works offline — your courses and notes travel with you

Parents: manage learners, approve payments and follow every progress
report from your phone. Tutors: run your teaching console — attendance,
grading and earnings — on the go.

Download NUVORA today and learn beyond boundaries.
```

### Keywords (iOS, ≤ 100 chars)
`tutoring,tutor,learning,education,exam prep,UTME,IGCSE,SAT,GRE,IELTS,online classes,study,nigerian curriculum,british curriculum`

### App Privacy (Data Safety) answers
| Data | Collected | Purpose |
|---|---|---|
| Name, email, phone | Yes | Account, support, contact |
| User content (messages, submissions, chat) | Yes | Features |
| Purchase history | Yes | Payments, fraud prevention |
| Identifiers (push tokens) | Yes | Notifications |
| Precise location / health / browsing history | No | — |
| Advertising / third-party tracking | No | — |

Also state: data is encrypted in transit; users can request export or
deletion (https://app.nuvora.com/privacy).

### Export compliance
- Uses encryption (HTTPS/TLS): YES → select **"Exempt"** (standard
  encryption).

## Play Console (Android)

| Field | Value |
|---|---|
| App name | NUVORA |
| Short description (≤ 80) | Learn beyond boundaries — vetted tutors, live cohorts, exam prep & private tuition. |
| Full description | (same as iOS description above) |
| Category | Education |
| Content rating | Everyone (Education) — no user-generated public content |
| Target audience | 13+ (minors require guardian-managed accounts) |
| Data safety | Mirror the iOS privacy table |
| App access | All features available without login except checkout/account |

### Store listing graphics
- Feature graphic: 1024×500 (brand navy + gold wordmark)
- Phone screenshots (min 2, recommend 8): welcome, tutor search, cohort
  detail, checkout, LMS course, quiz, chat assistant, progress reports
- Icon: `mobile/assets/icon.png` (1024)
- Teaser video (optional, ≤ 200s)

## Rollout
1. Internal testing → 2. Closed testing (≥ 14 days counts toward the
   production policy window) → 3. Staged production (10% → 50% → 100%).

## Pre-submission checklist
- [ ] `expo-doctor` + `tsc` clean
- [ ] API production config validated (config.Validate fail-fast)
- [ ] Privacy + Terms URLs live (https://app.nuvora.com/privacy, /terms)
- [ ] Google OAuth creds + redirect URL configured if enabled
- [ ] `EXPO_ACCESS_TOKEN` + correct `extra.projectId` for push
- [ ] Paystack/Flutterwave live keys in production env
- [ ] Screenshots reflect the shipped UI (no mock data in store graphics)
- [ ] TestFlight + internal track: auth, onboarding, LMS, chat, push OK
