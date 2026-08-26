package service

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/plus"
	"ykay-virtual/internal/notification"
)

// PlusReportService — NUVORA Plus weekly report email (P4). Each week the
// worker emails active Plus subscribers a branded summary with a link to their
// dashboard/progress. The report is an HTML email (print-to-PDF friendly), not
// a binary attachment, so it needs no extra PDF dependency.
type PlusReportService struct {
	plus    plus.Repository
	users   identity.UserRepository
	mail    notification.EmailSender
	siteURL string
	now     func() time.Time
}

func NewPlusReportService(plus plus.Repository, users identity.UserRepository, mail notification.EmailSender, siteURL string) *PlusReportService {
	return &PlusReportService{plus: plus, users: users, mail: mail, siteURL: siteURL, now: time.Now}
}

// SendWeeklyReports emails every active Plus user. Returns the number sent.
func (s *PlusReportService) SendWeeklyReports(ctx context.Context) (int, error) {
	if s.plus == nil || s.users == nil || s.mail == nil {
		return 0, nil
	}
	ids, err := s.plus.ListActiveUserIDs(ctx, s.now().UTC())
	if err != nil {
		return 0, err
	}
	sent := 0
	for _, uid := range ids {
		u, err := s.users.FindByID(ctx, uid)
		if err != nil || u == nil || strings.TrimSpace(u.Email) == "" {
			continue
		}
		sub, _ := s.plus.GetActiveByUser(ctx, uid, s.now().UTC())
		planName := "NUVORA Plus"
		if sub != nil {
			if p, err := s.plus.GetPlanByCode(ctx, sub.PlanCode); err == nil && p != nil {
				planName = p.Name
			}
		}
		body := s.render(planName, u.FirstName, uid.String())
		if err := s.mail.Send(ctx, u.Email, "Your NUVORA Plus weekly report", body); err != nil {
			slog.Error("plus weekly report email failed", "user_id", uid, "error", err)
			continue
		}
		sent++
	}
	return sent, nil
}

func (s *PlusReportService) render(planName, firstName, userID string) string {
	base := strings.TrimRight(s.siteURL, "/")
	if base == "" {
		base = "https://nuvora.com"
	}
	name := firstName
	if strings.TrimSpace(name) == "" {
		name = "there"
	}
	week := s.now().UTC().Format("2 January 2006")
	return notification.BrandEmail(
		`<h1 style="margin:0 0 12px;font-size:20px;color:#013920;">Your weekly ` + planName + ` report</h1>` +
			`<p style="margin:0 0 16px;">Hi ` + name + `, here's your learning week at a glance.</p>` +
			`<p style="margin:0 0 8px;"><strong>Week ending</strong> ` + week + `</p>` +
			`<p style="margin:0 0 20px;">Rewatch recorded lessons, view your verified certificates, and pick up where you left off on the full practice-exam vault and AI tutor.</p>` +
			`<p><a href="` + base + `/dashboard" style="display:inline-block;background:#70F250;color:#013920;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;">Open my dashboard</a></p>` +
			`<p style="margin:20px 0 0;color:#8794AC;font-size:13px;">You're receiving this because you have an active ` + planName + ` subscription. Manage your plan at ` + base + `/account/plus.</p>`,
	)
}
