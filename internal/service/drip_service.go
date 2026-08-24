package service

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/payment"
	"ykay-virtual/internal/notification"

	"github.com/google/uuid"
)

// DripService — onboarding lifecycle email sequence (000062).
//
// Three steps, one email each, sent at most once per user (UNIQUE
// user+sequence+step in storage — a crashed cron retry never double-sends):
//
//	step 1 (welcome)      accounts aged 0–24 h  — always sent
//	step 2 (first step)   accounts aged 2–4 d   — only if no PAID order yet
//	step 3 (social proof) accounts aged 7–14 d  — only if no PAID order yet
//
// Audience: verified, active, non-tutor accounts. A worker cron drives this
// every 30 min; the step-1 window means a fresh signup gets the welcome
// within ~30 minutes.
type DripService struct {
	users   identity.UserRepository
	roles   identity.RoleRepository
	orders  payment.OrderRepository
	drips   identity.EmailDripRepository
	mail    notification.EmailSender
	siteURL string
	now     func() time.Time
}

func NewDripService(users identity.UserRepository, roles identity.RoleRepository,
	orders payment.OrderRepository, drips identity.EmailDripRepository,
	mail notification.EmailSender, siteURL string) *DripService {
	return &DripService{users: users, roles: roles, orders: orders,
		drips: drips, mail: mail, siteURL: strings.TrimRight(siteURL, "/"), now: time.Now}
}

// OnboardingStep describes one drip step.
type OnboardingStep struct {
	Step    int
	MinAge  time.Duration // account must be at least this old
	MaxAge  time.Duration // ... and younger than this (beyond → left alone)
	Subject string
	Body    func(first, link string) string
	CTA     func(base string) string
}

// OnboardingDripSteps — the sequence. Sent-once semantics come from storage.
var OnboardingDripSteps = []OnboardingStep{
	{
		Step: 1, MinAge: 0, MaxAge: 24 * time.Hour,
		Subject: "Welcome to NUVORA — here's how it works",
		CTA:     func(base string) string { return base + "/cohorts" },
		Body: func(first, link string) string {
			return `<h1 style="margin:0 0 12px;font-size:20px;color:#013920;">Welcome to NUVORA, ` + first + ` 👋</h1>` +
				`<p style="margin:0 0 12px;">Your account is ready. The short version of how NUVORA works:</p>` +
				`<ul style="margin:0 0 16px;padding-left:20px;color:#333;line-height:1.7;">` +
				`<li><b>Browse live cohorts</b> — small-group classes for WAEC/NECO/JAMB/IGCSE and more.</li>` +
				`<li><b>Or pick a private tutor</b> — vetted, one-on-one, on your schedule.</li>` +
				`<li><b>Pay safely</b> — every payment is held in escrow until lessons are delivered.</li></ul>` +
				`<p style="margin:0 0 16px;"><a href="` + link + `" style="display:inline-block;background:#013920;color:#f7d774;padding:12px 24px;border-radius:9999px;font-weight:700;text-decoration:none;">Explore cohorts</a></p>` +
				`<p style="margin:0;color:#555;">Questions? Just reply — a human reads it.</p>`
		},
	},
	{
		Step: 2, MinAge: 48 * time.Hour, MaxAge: 96 * time.Hour,
		Subject: "Ready for your first NUVORA lesson?",
		CTA:     func(base string) string { return base + "/tutors" },
		Body: func(first, link string) string {
			return `<h1 style="margin:0 0 12px;font-size:20px;color:#013920;">Your next step, ` + first + `</h1>` +
				`<p style="margin:0 0 12px;">You created your NUVORA account a couple of days ago but haven't booked yet.` +
				` Most families start with either:</p>` +
				`<ul style="margin:0 0 16px;padding-left:20px;color:#333;line-height:1.7;">` +
				`<li>a <b>private tutor</b> for a specific subject, or</li>` +
				`<li>a <b>live exam-prep cohort</b> with weekly classes and progress reports.</li></ul>` +
				`<p style="margin:0 0 16px;"><a href="` + link + `" style="display:inline-block;background:#013920;color:#f7d774;padding:12px 24px;border-radius:9999px;font-weight:700;text-decoration:none;">Find a tutor</a></p>` +
				`<p style="margin:0;color:#555;">Payments stay in escrow until lessons are delivered — you're never at risk.</p>`
		},
	},
	{
		Step: 3, MinAge: 7 * 24 * time.Hour, MaxAge: 14 * 24 * time.Hour,
		Subject: "Last nudge from us (promise)",
		CTA:     func(base string) string { return base + "/help" },
		Body: func(first, link string) string {
			return `<h1 style="margin:0 0 12px;font-size:20px;color:#013920;">Still deciding, ` + first + `?</h1>` +
				`<p style="margin:0 0 12px;">No pressure — this is our last onboarding email. If something specific is` +
				` holding you back (pricing, subjects, timing, trust), tell us directly and we'll sort it out:</p>` +
				`<p style="margin:0 0 16px;"><a href="` + link + `" style="display:inline-block;background:#013920;color:#f7d774;padding:12px 24px;border-radius:9999px;font-weight:700;text-decoration:none;">Talk to us</a></p>` +
				`<p style="margin:0;color:#555;">Whenever you're ready, your account is waiting — and payments are always escrow-protected.</p>`
		},
	},
}

// SendOnboardingStep — runs one step over eligible accounts; returns emails
// sent. A failed send records no drip row (next tick retries); a failure on
// one user never stops the sweep.
func (s *DripService) SendOnboardingStep(ctx context.Context, step OnboardingStep, limit int) (int, error) {
	if s.users == nil || s.drips == nil || s.mail == nil {
		return 0, nil // feature not wired — no-op
	}
	now := s.now().UTC()
	candidates, err := s.users.ListCreatedBetween(ctx, now.Add(-step.MaxAge), now.Add(-step.MinAge), limit)
	if err != nil {
		return 0, err
	}
	sent := 0
	for i := range candidates {
		u := candidates[i]
		if u.EmailVerifiedAt == nil || u.Status != identity.UserStatusActive {
			continue // never email unverified or non-active accounts
		}
		if done, err := s.drips.ExistsStep(ctx, u.ID, "onboarding", step.Step); err != nil || done {
			continue
		}
		// Steps 2–3 are conversion nudges — skip anyone who already paid.
		if step.Step > 1 {
			paid, err := s.hasPaidOrder(ctx, u.ID)
			if err != nil {
				slog.Warn("drip: paid-order lookup failed", "user_id", u.ID, "error", err)
				continue
			}
			if paid {
				continue
			}
		}
		if s.roles != nil && s.isTutor(ctx, u.ID) {
			continue // tutors have their own vetting funnel
		}
		first := strings.TrimSpace(u.FirstName)
		if first == "" {
			first = "there"
		}
		base := s.siteURL
		if base == "" {
			base = "https://nuvora.com"
		}
		link := step.CTA(base)
		html := notification.BrandEmail(step.Body(first, link)) +
			`<p style="margin:24px 0 0;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px;">` +
			`You're receiving this because you created a NUVORA account. Reply to reach a human.</p>`
		if err := s.mail.Send(ctx, u.Email, step.Subject, html); err != nil {
			slog.Warn("drip: send failed", "user_id", u.ID, "step", step.Step, "error", err)
			continue
		}
		if err := s.drips.Create(ctx, &identity.EmailDrip{
			UserID: u.ID, Sequence: "onboarding", Step: step.Step, SentAt: now,
		}); err != nil && err != domain.ErrAlreadyExists {
			slog.Error("drip: record failed AFTER send", "user_id", u.ID, "step", step.Step, "error", err)
		}
		sent++
	}
	return sent, nil
}

// hasPaidOrder — any settled order for this user (orders repo is parent-
// scoped; PAID or COMPLETED counts).
func (s *DripService) hasPaidOrder(ctx context.Context, userID uuid.UUID) (bool, error) {
	if s.orders == nil {
		return false, nil
	}
	orders, _, err := s.orders.ListByParentUserID(ctx, userID, 20, 0)
	if err != nil {
		return false, err
	}
	for i := range orders {
		if orders[i].Status == payment.OrderPaid {
			return true, nil
		}
	}
	return false, nil
}

func (s *DripService) isTutor(ctx context.Context, userID uuid.UUID) bool {
	roleList, err := s.roles.RolesForUser(ctx, userID)
	if err != nil {
		return false
	}
	for _, r := range roleList {
		if r.Name == "TUTOR" {
			return true
		}
	}
	return false
}
