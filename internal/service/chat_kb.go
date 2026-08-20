package service

import (
	"strings"
	"unicode"
)

// chatKB is the offline knowledge base used when Gemini is not configured
// (or the provider call fails). Answers stay factual and never invent prices.
type kbEntry struct {
	keys   []string
	answer string
}

var chatKB = []kbEntry{
	{[]string{"create", "account", "sign", "up", "register", "signup"},
		"Click Get started, enter your name and email, verify the 6-digit code we send, choose your role and set a password. It takes under two minutes."},
	{[]string{"role", "parent", "student", "tutor", "school"},
		"Choose Parent if you are booking for a child, Student if you are learning yourself, Tutor if you want to teach, or School/Company for an institution."},
	{[]string{"add", "learner", "child"},
		"From your dashboard or Account → Learners, tap Add a learner and enter their name and level. A minor (under 17) must be linked to a parent or guardian to enrol."},
	{[]string{"verification", "code", "verify", "email", "otp"},
		"Check spam, then use Resend code. Codes are single-use and expire after 10 minutes. If nothing arrives, contact support."},
	{[]string{"join", "live", "lesson", "class", "meeting"},
		"Open My Learning (LMS), choose your course, and open the lesson. The meeting link appears in the join window before the session."},
	{[]string{"recorded", "recording", "materials", "resource", "course"},
		"Open LMS → My courses. Cohort sessions include recordings and resources where the programme provides them. Private tuition recordings follow your tutor's agreement."},
	{[]string{"assignment", "homework", "due", "quiz"},
		"Assignments and quizzes live in the LMS for your course. Open LMS → your cohort to see due dates, submit work and check grades."},
	{[]string{"progress", "attendance", "report", "grade"},
		"Students see attendance and assignments on the student dashboard and LMS. Parents see attendance, submissions and weekly progress reports on the family dashboard."},
	{[]string{"reschedule", "private", "tuition"},
		"You can reschedule a private lesson within your package window. Contact your tutor or support — the update keeps escrow and remaining sessions intact."},
	{[]string{"pay", "payment", "escrow", "card", "paystack", "flutterwave", "refund", "fee", "price", "cost", "how much", "cohort"},
		"Fees are listed on each programme/cohort page — I don't quote prices from memory. Pay with card or bank transfer via Paystack or Flutterwave. Money sits in escrow and is released to the tutor only after lessons are delivered. Never pay a tutor off-platform. Refunds follow the Cancellation & Refund policy."},
	{[]string{"tutor", "apply", "teach", "vetting", "earn"},
		"Start at Become a tutor: create your profile, choose subjects, upload a government-issued ID and pass a subject competency quiz (70% to pass). We review within 5–7 working days. You set your rates; NUVORA takes a platform fee and holds learner payments in escrow."},
	{[]string{"safeguard", "child", "safety", "privacy", "report"},
		"Minors are linked to parents or guardians, contact details are not exposed to tutors unless required, and messaging is booking-scoped. To report a concern, contact support immediately. You can export or delete your data from Account."},
	{[]string{"login", "password", "sign in"},
		"Use your email and password on /login, or request a 6-digit email code. Admins also enter an MFA code from email (or the API log in local development)."},
}

func cannedReply(userText string) string {
	if escalateRe.MatchString(userText) {
		return "I've flagged this for our team — a human agent will follow up on this conversation shortly. You can also write to support from Help."
	}
	if ans := matchChatKB(userText); ans != "" {
		return ans
	}
	return "I can help with accounts, lessons, payments, tutors and safeguarding. Try asking how to join a live lesson, how escrow works, how to add a learner, or how to become a tutor. For anything I can't answer, say you'd like a human and I'll hand you to the team."
}

func matchChatKB(userText string) string {
	tokens := kbTokens(userText)
	if len(tokens) == 0 {
		return ""
	}
	bestScore := 0
	best := ""
	lower := strings.ToLower(userText)
	for _, e := range chatKB {
		score := 0
		for _, k := range e.keys {
			if strings.Contains(lower, k) {
				score += 2
			}
			if tokens[k] {
				score++
			}
		}
		if score > bestScore {
			bestScore = score
			best = e.answer
		}
	}
	if bestScore < 2 {
		return ""
	}
	return best
}

func kbTokens(s string) map[string]bool {
	out := make(map[string]bool)
	var b strings.Builder
	flush := func() {
		w := strings.ToLower(b.String())
		b.Reset()
		if len(w) < 3 {
			return
		}
		out[w] = true
	}
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		} else {
			flush()
		}
	}
	flush()
	return out
}
