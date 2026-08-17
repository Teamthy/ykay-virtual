// Help Center data — the single source of truth for support FAQs, grouped by
// category. The /help page renders this with client-side search; keep answers
// factual and synced with the actual product behaviour (escrow, vetting,
// curricula, payments).

export type HelpFaq = { q: string; a: string };
export type HelpCategory = { id: string; title: string; blurb: string; faqs: HelpFaq[] };

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting started",
    blurb: "Accounts, onboarding and finding the right programme.",
    faqs: [
      { q: "How do I create an account?", a: "Click Get started (or Create an account), enter your name and email, verify the 6-digit code we send you, choose your role and set a password. It takes under two minutes." },
      { q: "Which role should I choose?", a: "Parent if you're booking for a child, Student if you're learning yourself, Tutor if you want to teach, or School/Company for an institution." },
      { q: "How do I add a learner?", a: "From your dashboard or Account → Learners, tap Add a learner and enter their name and level. A minor (under 17) must be linked to a parent or guardian to enrol." },
      { q: "I didn't get my verification code", a: "Check your spam folder, then use Resend code. If it still doesn't arrive, contact support — codes are single-use and expire after 10 minutes." },
    ],
  },
  {
    id: "lessons",
    title: "Lessons & cohorts",
    blurb: "Schedules, joining live lessons, attendance and resources.",
    faqs: [
      { q: "How do I join a live lesson?", a: "Open My Learning, choose your course, and open the lesson. The meeting link is available inside the join window before the session." },
      { q: "Are lessons recorded?", a: "Cohort sessions include recordings and resources where the programme provides them. Private tuition recordings follow your tutor's agreement." },
      { q: "Can I reschedule a private lesson?", a: "Yes — reschedule within your package window. Contact your tutor or support; the schedule update keeps your escrow and sessions intact." },
      { q: "How do I see my child's progress?", a: "The parent dashboard shows attendance, assignments, submissions and weekly progress reports with strengths, weaknesses and recommendations." },
    ],
  },
  {
    id: "payments",
    title: "Payments & escrow",
    blurb: "How billing, escrow and refunds work.",
    faqs: [
      { q: "How is my payment protected?", a: "Your fee is held in escrow and released to the tutor only after lessons are delivered — either when you confirm or automatically after the delivery window." },
      { q: "Which payment methods do you accept?", a: "We accept card payments and bank transfers through Paystack and Flutterwave. Never pay a tutor directly off-platform." },
      { q: "How do refunds work?", a: "Refunds follow our Cancellation & Refund policy — see the policy page for the full terms. Unused escrow can be returned per the policy." },
      { q: "When do tutors get paid?", a: "Tutors are paid weekly from released escrow after lessons are confirmed delivered." },
    ],
  },
  {
    id: "tutors",
    title: "Becoming a tutor",
    blurb: "Vetting, subjects, assessments and earnings.",
    faqs: [
      { q: "How do I apply to teach?", a: "Start at Become a tutor: create your profile, choose subjects, upload a government-issued ID and pass a subject competency quiz. We review within 5–7 working days." },
      { q: "What is the competency assessment?", a: "A short quiz on each subject you applied to teach — 70% to pass, valid for 12 months. You're tested only on the subjects you chose." },
      { q: "What do tutors earn?", a: "You set your own rates; NUVORA takes a platform fee and holds learner payments in escrow until lessons are delivered." },
      { q: "How does vetting work?", a: "Staged: identity + documents, competency assessment, interview and background checks before approval. Documents live in a private bucket with signed URLs." },
    ],
  },
  {
    id: "safety",
    title: "Safeguarding & privacy",
    blurb: "How we keep learners safe and handle your data.",
    faqs: [
      { q: "How do you protect children?", a: "Minors are linked to parents or guardians, contact details are never exposed to tutors unless required, messaging is booking-scoped, and lesson access is governed." },
      { q: "How do I report a concern?", a: "Contact support immediately. Our safeguarding policy and reporting path are in the legal section of this site." },
      { q: "How is my data used?", a: "See our Privacy Policy for the full detail. You can export everything we hold on your account from Account → Export data, and delete it at any time." },
    ],
  },
];

/** URL-safe slug from a question title (stable, deterministic). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type HelpArticle = HelpFaq & { slug: string; category: HelpCategory };

/** Flattened list of every FAQ with its slug and parent category. */
export function getHelpArticles(): HelpArticle[] {
  const articles: HelpArticle[] = [];
  for (const category of HELP_CATEGORIES) {
    for (const faq of category.faqs) {
      articles.push({ ...faq, slug: slugify(faq.q), category });
    }
  }
  return articles;
}

/** Look up one article by slug (undefined when unknown). */
export function getHelpArticle(slug: string): HelpArticle | undefined {
  return getHelpArticles().find((a) => a.slug === slug);
}
