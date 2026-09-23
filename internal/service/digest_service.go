package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"

	"ykay-virtual/internal/domain/digest"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/practice"
	"ykay-virtual/internal/notification"
)

// DigestService — weekly parent progress digest (feature 3, 000076). Parents
// toggle it from the dashboard; the worker calls SendDigests, which collects
// each child's real practice activity since last_sent_at and emails an honest
// summary. Children with no activity are reported plainly; a parent with no
// activity at all is skipped (never sent a fabricated "all good!" email).
type DigestService struct {
	prefs    digest.Repository
	users    identity.UserRepository
	students identity.StudentProfileRepository
	practice practice.Repository
	mail     notification.EmailSender
	siteURL  string
	now      func() time.Time
}

func NewDigestService(
	prefs digest.Repository,
	users identity.UserRepository,
	students identity.StudentProfileRepository,
	practice practice.Repository,
	mail notification.EmailSender,
	siteURL string,
) *DigestService {
	return &DigestService{prefs: prefs, users: users, students: students, practice: practice, mail: mail, siteURL: siteURL, now: time.Now}
}

// GetPrefs returns the parent's prefs, defaulting to enabled=true when absent.
func (s *DigestService) GetPrefs(ctx context.Context, parentUserID uuid.UUID) (*digest.Prefs, error) {
	if s.prefs == nil {
		return nil, nil
	}
	p, err := s.prefs.Get(ctx, parentUserID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return &digest.Prefs{ParentUserID: parentUserID, Enabled: true}, nil
		}
		return nil, err
	}
	return p, nil
}

// SetEnabled persists the parent's on/off toggle.
func (s *DigestService) SetEnabled(ctx context.Context, parentUserID uuid.UUID, enabled bool) error {
	if s.prefs == nil {
		return nil
	}
	return s.prefs.Upsert(ctx, &digest.Prefs{ParentUserID: parentUserID, Enabled: enabled, UpdatedAt: s.now()})
}

// summarize attempts since `since`, computing an honest count + average score.
func summarize(attempts []practice.Attempt, since time.Time) (count, avg int) {
	sum, n := 0, 0
	for _, a := range attempts {
		if a.SubmittedAt == nil || a.Score == nil {
			continue
		}
		if a.SubmittedAt.After(since) {
			sum += *a.Score
			n++
		}
	}
	if n == 0 {
		return 0, 0
	}
	return n, sum / n
}

// compose builds the email body. Returns hasContent=false when no child has
// any activity in the window, so the caller skips the send.
func (s *DigestService) compose(ctx context.Context, parent *identity.User, since time.Time) (html string, hasContent bool, err error) {
	students, err := s.students.ListByParentUserID(ctx, parent.ID)
	if err != nil {
		return "", false, fmt.Errorf("digest list students: %w", err)
	}
	if len(students) == 0 {
		return "", false, nil
	}
	rows := make([]string, 0, len(students))
	anyActivity := false
	for _, st := range students {
		attempts, aerr := s.practice.ListAttemptsByStudent(ctx, st.ID, 200)
		if aerr != nil {
			return "", false, fmt.Errorf("digest list attempts: %w", aerr)
		}
		n, avg := summarize(attempts, since)
		name := strings.TrimSpace(st.FirstName + " " + st.LastName)
		if name == "" {
			name = "Your child"
		}
		if n > 0 {
			anyActivity = true
			rows = append(rows, fmt.Sprintf(
				`<tr><td style="padding:6px 0;font-size:15px;color:#0F2A1A;">%s</td>`+
					`<td style="padding:6px 0;font-size:15px;color:#0F2A1A;text-align:right;">%d quiz attempt(s), average %d%%</td></tr>`,
				name, n, avg))
		} else {
			rows = append(rows, fmt.Sprintf(
				`<tr><td style="padding:6px 0;font-size:15px;color:#0F2A1A;">%s</td>`+
					`<td style="padding:6px 0;font-size:15px;color:#5b6b5f;text-align:right;">No new activity this period</td></tr>`,
				name))
		}
	}
	if !anyActivity {
		return "", false, nil
	}
	greet := "there"
	if strings.TrimSpace(parent.FirstName) != "" {
		greet = parent.FirstName
	}
	body := `<h1 style="margin:0 0 12px;font-size:20px;color:#0F2A1A;">Your weekly learning digest</h1>` +
		fmt.Sprintf(`<p style="margin:0 0 16px;font-size:15px;color:#0F2A1A;">Hi %s, here's how your learner(s) got on this period:</p>`, greet) +
		`<table style="width:100%;border-collapse:collapse;">` + strings.Join(rows, "") + `</table>` +
		fmt.Sprintf(`<p style="margin:20px 0 0;"><a href="%s/dashboard/parent" style="display:inline-block;padding:12px 20px;background:#D6FF57;color:#0F2A1A;border-radius:999px;text-decoration:none;font-weight:600;">View progress</a></p>`, s.siteURL)
	return notification.BrandEmail(body), true, nil
}

// SendDigests emails every enabled parent with fresh activity. Returns the
// number sent. Skips parents with no email, no children, or no new activity.
func (s *DigestService) SendDigests(ctx context.Context) (int, error) {
	if s.prefs == nil || s.users == nil || s.students == nil || s.practice == nil || s.mail == nil {
		return 0, nil
	}
	prefs, err := s.prefs.ListEnabled(ctx)
	if err != nil {
		return 0, err
	}
	sent := 0
	for i := range prefs {
		p := prefs[i]
		u, uerr := s.users.FindByID(ctx, p.ParentUserID)
		if uerr != nil || u == nil || strings.TrimSpace(u.Email) == "" {
			continue
		}
		var since time.Time
		if p.LastSentAt != nil {
			since = *p.LastSentAt
		}
		body, ok, cerr := s.compose(ctx, u, since)
		if cerr != nil {
			slog.Error("parent digest compose failed", "parent_user_id", p.ParentUserID, "error", cerr)
			continue
		}
		if !ok {
			continue
		}
		if err := s.mail.Send(ctx, u.Email, "Your weekly learning digest", body); err != nil {
			slog.Error("parent digest email failed", "parent_user_id", p.ParentUserID, "error", err)
			continue
		}
		now := s.now()
		p.LastSentAt = &now
		p.Enabled = true
		if err := s.prefs.Upsert(ctx, &p); err != nil {
			slog.Error("parent digest mark-sent failed", "parent_user_id", p.ParentUserID, "error", err)
			continue
		}
		sent++
	}
	return sent, nil
}
