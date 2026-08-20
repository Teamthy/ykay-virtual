import { getHelpArticles } from "@/lib/help-data";

const STOP = new Set([
  "the", "and", "for", "how", "do", "i", "my", "is", "a", "to", "what", "when",
  "can", "you", "me", "please", "with", "on", "in", "of", "it", "or", "we",
]);

/** Local answers when the user is not signed in, or the API is unreachable. */
export function answerFromKnowledge(question: string): string {
  const q = question.trim();
  const tokens = q
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length > 2 && !STOP.has(w));
  const lower = q.toLowerCase();

  if (/(human|agent|refund|complaint|speak to|talk to someone|escalat|unhappy)/i.test(q)) {
    return "I can hand this to a person. Log in and tap “Talk to a person”, or write via Help → Contact support. Refunds follow the Cancellation & Refund policy — never pay a tutor off-platform.";
  }

  let bestScore = 0;
  let best = "";
  for (const a of getHelpArticles()) {
    const hay = `${a.q} ${a.a}`.toLowerCase();
    let score = 0;
    for (const t of tokens) if (hay.includes(t)) score += 1;
    if (a.q.toLowerCase() === lower) score += 6;
    else if (a.q.toLowerCase().includes(lower) || lower.includes(a.q.toLowerCase())) score += 4;
    if (score > bestScore) {
      bestScore = score;
      best = a.a;
    }
  }
  if (bestScore >= 2) return best;

  if (/(material|resource|lms|course)/i.test(q)) {
    return "Open LMS → My courses. Recordings, notes and resources sit on each lesson where the programme provides them.";
  }
  if (/(assignment|due|quiz|homework)/i.test(q)) {
    return "Assignments and quizzes are in the LMS for your cohort. Open the course to see due dates, submit work and check grades.";
  }
  if (/(progress|attendance|grade)/i.test(q)) {
    return "Your student dashboard and LMS show attendance and assignments. Parents see weekly progress reports on the family dashboard.";
  }

  return "I can help with accounts, lessons, payments, tutors and safeguarding. Try the Knowledge Base tab, or ask how to join a live lesson, how escrow works, or how to add a learner. Log in to save this chat and reach a human agent.";
}
