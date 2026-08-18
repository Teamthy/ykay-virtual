package notification

import (
	"context"
	"fmt"
	"log/slog"
	"net/smtp"
	"os"
	"strings"
)

// EmailSender â€” outbound email adapter (AGENTS.md internal/notification).
// Implementations:
//   - ConsoleEmailSender â€” logs emails to stdout (dev default)
//   - SMTPEmailSender   â€” real SMTP delivery via SMTP_* env vars
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

// ConsoleEmailSender â€” dev: logs the email so links are clickable in the
// terminal during local development.
type ConsoleEmailSender struct{}

func (ConsoleEmailSender) Send(_ context.Context, to, subject, htmlBody string) error {
	// Safe logging (A-20/A-21): the console sender runs only when SMTP is not
	// configured. In production that is a misconfiguration â€” warn WITHOUT
	// logging the body (which may contain magic links/codes/PII).
	if os.Getenv("ENVIRONMENT") == "production" {
		slog.Error("email console sender used in production â€” SMTP_HOST is not set; OTP/codes are NOT emailed", "to", to, "subject", subject)
		return fmt.Errorf("smtp not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM")
	}
	// Dev console: log enough of the body to include codes/links (the branded
	// shell is long, so 300 would hide them).
	slog.Info("EMAIL (console/dev)", "to", to, "subject", subject, "body_len", len(htmlBody), "body", truncate(htmlBody, 3000))
	return nil
}

// SMTPEmailSender â€” production: plain SMTP (TLS/STARTTLS via smtp.SendMail).
type SMTPEmailSender struct {
	host, port, user, pass, from string
}

func NewSMTPEmailSender(host, port, user, pass, from string) *SMTPEmailSender {
	return &SMTPEmailSender{host: host, port: port, user: user, pass: pass, from: from}
}

func (s *SMTPEmailSender) Send(_ context.Context, to, subject, htmlBody string) error {
	headerFrom, addr := parseFrom(s.from)
	port := s.port
	if port == "" {
		port = "587"
	}
	addrHost := fmt.Sprintf("%s:%s", s.host, port)
	msg := strings.Join([]string{
		"From: " + headerFrom,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"",
		htmlBody,
	}, "\r\n")
	auth := smtp.PlainAuth("", s.user, s.pass, s.host)
	if err := smtp.SendMail(addrHost, auth, addr, []string{to}, []byte(msg)); err != nil {
		slog.Error("smtp send failed", "to", to, "subject", subject, "error", err)
		return fmt.Errorf("smtp send: %w", err)
	}
	slog.Info("smtp sent", "to", to, "subject", subject)
	return nil
}

// parseFrom accepts "you@domain" or "NUVORA <you@domain>" without double-wrapping.
func parseFrom(from string) (header, addr string) {
	from = strings.TrimSpace(from)
	if from == "" {
		return "NUVORA <beth.t@example.com>", "beth.t@example.com"
	}
	if i := strings.Index(from, "<"); i >= 0 {
		j := strings.Index(from, ">")
		if j > i {
			addr = strings.TrimSpace(from[i+1 : j])
			if addr != "" {
				return from, addr
			}
		}
	}
	return "NUVORA <" + from + ">", from
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	// Keep the TAIL â€” dev logs exist to expose codes/links, which live at
	// the end of the branded email shell (verification/reset links).
	head := 200
	if n <= head+50 {
		head = 0
	}
	if head == 0 {
		return "â€¦" + s[len(s)-n:]
	}
	return s[:head] + " â€¦[truncated]â€¦ " + s[len(s)-(n-head):]
}

// BrandEmail â€” wraps an HTML body in the NUVORA email shell (navy header,
// gold accent, footer). Used by every outbound template so transactional
// emails carry the brand.
func BrandEmail(bodyHTML string) string {
	return `<!DOCTYPE html>
<html lang="en"><body style="margin:0;padding:0;background:#FFFCF5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFCF5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #F0ECE3;box-shadow:0 8px 24px rgba(0,0,0,.06);">
        <tr><td style="background:#F4B400;padding:24px 32px;">
          <div style="color:#111111;font-size:22px;font-weight:800;letter-spacing:0.14em;">NUVORA</div>
          <div style="color:#111111;font-size:12px;margin-top:4px;letter-spacing:0.08em;opacity:.65;">LEARNING BEYOND BOUNDARIES</div>
        </td></tr>
        <tr><td style="padding:32px;color:#333333;font-size:15px;line-height:1.6;">` + bodyHTML + `</td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #F0ECE3;color:#777777;font-size:12px;">
          British &amp; Nigerian curricula &middot; Exam preparation &middot; Private tuition &middot; Live cohorts<br/>
          &copy; 2026 NUVORA. If this email wasn&rsquo;t expected, you can safely ignore it.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}
