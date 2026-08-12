package notification

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
)

// EmailSender — outbound email adapter (AGENTS.md internal/notification).
// Implementations:
//   - ConsoleEmailSender — logs emails to stdout (dev default)
//   - SMTPEmailSender   — real SMTP delivery via SMTP_* env vars
type EmailSender interface {
	Send(ctx context.Context, to, subject, htmlBody string) error
}

func NewEmailSender() EmailSender {
	if os.Getenv("SMTP_HOST") != "" {
		return NewSMTPEmailSender(
			os.Getenv("SMTP_HOST"),
			os.Getenv("SMTP_PORT"),
			os.Getenv("SMTP_USER"),
			os.Getenv("SMTP_PASS"),
			os.Getenv("EMAIL_FROM"),
		)
	}
	return ConsoleEmailSender{}
}

// ConsoleEmailSender — dev: logs the email so links are clickable in the
// terminal during local development.
type ConsoleEmailSender struct{}

func (ConsoleEmailSender) Send(_ context.Context, to, subject, htmlBody string) error {
	// Dev console: log enough of the body to include codes/links (the branded
	// shell is long, so 300 would hide them).
	log.Printf("📧 EMAIL to=%s subject=%q body=%s", to, subject, truncate(htmlBody, 3000))
	return nil
}

// SMTPEmailSender — production: plain SMTP (TLS/STARTTLS via smtp.SendMail).
type SMTPEmailSender struct {
	host, port, user, pass, from string
}

func NewSMTPEmailSender(host, port, user, pass, from string) *SMTPEmailSender {
	return &SMTPEmailSender{host: host, port: port, user: user, pass: pass, from: from}
}

func (s *SMTPEmailSender) Send(_ context.Context, to, subject, htmlBody string) error {
	if s.from == "" {
		s.from = "no-reply@nuvora.com"
	}
	addr := fmt.Sprintf("%s:%s", s.host, s.port)
	msg := strings.Join([]string{
		"From: NUVORA <" + s.from + ">",
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
		htmlBody,
	}, "\r\n")
	auth := smtp.PlainAuth("", s.user, s.pass, s.host)
	if err := smtp.SendMail(addr, auth, s.from, []string{to}, []byte(msg)); err != nil {
		return fmt.Errorf("smtp send: %w", err)
	}
	return nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

// BrandEmail — wraps an HTML body in the NUVORA email shell (navy header,
// gold accent, footer). Used by every outbound template so transactional
// emails carry the brand.
func BrandEmail(bodyHTML string) string {
	return `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#F3F6FB;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F6FB;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E8EEF7;">
        <tr><td style="background:linear-gradient(120deg,#060F26,#0A1F44 55%,#1E5EFF);padding:28px 32px;">
          <div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:0.14em;">NUVORA</div>
          <div style="color:#C9A227;font-size:12px;margin-top:4px;letter-spacing:0.08em;">LEARNING BEYOND BOUNDARIES</div>
        </td></tr>
        <tr><td style="padding:32px;color:#2B3448;font-size:15px;line-height:1.6;">` + bodyHTML + `</td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #E8EEF7;color:#8794AC;font-size:12px;">
          British &amp; Nigerian curricula &middot; Exam preparation &middot; Private tuition &middot; Live cohorts<br/>
          &copy; 2026 NUVORA. If this email wasn&rsquo;t expected, you can safely ignore it.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
