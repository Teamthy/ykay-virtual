package service

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/chat"
	"ykay-virtual/internal/domain/identity"
	"ykay-virtual/internal/domain/plus"

	"github.com/google/uuid"
)

// ChatService — AI assistant threads with human handoff (phase 33).
//   - Threads are owned by a user (session cookie).
//   - Messages are stored append-only; the last N form the provider history.
//   - A ChatProvider (Gemini by default) generates assistant replies.
//     When no provider is configured the service degrades gracefully with a
//     canned reply so the UX never breaks (same pattern as Google OAuth).
//   - Escalation flips the thread to ESCALATED and opens a support ticket
//     with the transcript for a human agent.

const (
	chatHistoryWindow = 12
	chatTitleFallback = "NUVORA support chat"
)

var (
	emailRe    = regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)
	phoneRe    = regexp.MustCompile(`(\+?[0-9][0-9\s\-]{7,14}[0-9])`)
	escalateRe = regexp.MustCompile(`(?i)(human|agent|refund|complaint|speak to|talk to someone|escalat|my account is|unhappy|poor service)`)
)

// ChatProvider generates an assistant reply from the conversation history.
type ChatProvider interface {
	// Reply returns the assistant text. Grounding context (fresh catalogue
	// data) is supplied by the service so answers stay accurate.
	Reply(ctx context.Context, history []chat.Message, grounding string) (string, error)
}

// ChatContextBuilder assembles fresh grounding context (programmes, cohorts,
// tutors, FAQ highlights) injected into every provider call.
type ChatContextBuilder func(ctx context.Context) (string, error)

type ChatService struct {
	threads    chat.ThreadRepository
	support    *SupportService
	users      identity.UserRepository
	provider   ChatProvider
	contextFor ChatContextBuilder
	pusher     *PushService
	notifier   *NotifierService
	plus       *PlusService // AI-assistant allowance gate (000066)
	now        func() time.Time
}

func NewChatService(threads chat.ThreadRepository, support *SupportService, users identity.UserRepository) *ChatService {
	return &ChatService{
		threads: threads,
		support: support,
		users:   users,
		now:     time.Now,
	}
}

// WithNotifier wires WhatsApp notification when a chat escalates to a human
// (best-effort; failures never fail the escalation itself).
// WithPlus wires the NUVORA Plus gate for the AI-assistant daily allowance.
func (s *ChatService) WithPlus(p *PlusService) *ChatService {
	s.plus = p
	return s
}

func (s *ChatService) WithNotifier(n *NotifierService) *ChatService {
	s.notifier = n
	return s
}

// WithProvider wires the AI provider (nil-safe: unconfigured → canned reply).
func (s *ChatService) WithProvider(p ChatProvider) *ChatService {
	s.provider = p
	return s
}

// WithPusher wires push notifications (agent replies notify the user's
// devices — M4).
func (s *ChatService) WithPusher(p *PushService) *ChatService {
	s.pusher = p
	return s
}

// WithContextBuilder wires the grounding context assembler.
func (s *ChatService) WithContextBuilder(fn ChatContextBuilder) *ChatService {
	s.contextFor = fn
	return s
}

// Enabled — whether an AI provider is configured.
func (s *ChatService) Enabled() bool { return s.provider != nil }

// CreateThread — starts a new support thread for the user.
func (s *ChatService) CreateThread(ctx context.Context, userID uuid.UUID, title string) (*chat.Thread, error) {
	if strings.TrimSpace(title) == "" {
		title = chatTitleFallback
	}
	t := &chat.Thread{
		ID: uuid.New(), UserID: userID, Title: strings.TrimSpace(title),
		Status: chat.ThreadOpen, CreatedAt: s.now().UTC(), UpdatedAt: s.now().UTC(),
	}
	if err := s.threads.CreateThread(ctx, t); err != nil {
		return nil, err
	}
	// Warm greeting.
	_, _ = s.append(ctx, t.ID, chat.RoleAssistant, "Hi! 👋 I'm Nuvora — ask me about programmes, cohorts, tutors or fees. If you need a person, just say so and I'll hand you to our team.")
	return t, nil
}

// ListThreads — the user's threads, newest first.
func (s *ChatService) ListThreads(ctx context.Context, userID uuid.UUID) ([]chat.Thread, error) {
	list, err := s.threads.ListThreadsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []chat.Thread{}
	}
	return list, nil
}

// ListMessages — all messages of one of the user's threads.
func (s *ChatService) ListMessages(ctx context.Context, userID, threadID uuid.UUID) ([]chat.Message, error) {
	if _, err := s.threadFor(ctx, userID, threadID); err != nil {
		return nil, err
	}
	list, err := s.threads.ListMessages(ctx, threadID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []chat.Message{}
	}
	return list, nil
}

// SendMessage — stores the user message, generates + stores the assistant
// reply, and returns it together with the thread status.
func (s *ChatService) SendMessage(ctx context.Context, userID, threadID uuid.UUID, content string) (string, chat.ThreadStatus, error) {
	thread, err := s.threadFor(ctx, userID, threadID)
	if err != nil {
		return "", "", err
	}
	if thread.Status == chat.ThreadClosed {
		return "", "", fmt.Errorf("%w: this conversation is closed — start a new thread", domain.ErrConflict)
	}
	content = strings.TrimSpace(content)
	if content == "" {
		return "", "", fmt.Errorf("%w: message is required", domain.ErrInvalidInput)
	}
	if _, err := s.append(ctx, threadID, chat.RoleUser, content); err != nil {
		return "", "", err
	}

	history, err := s.threads.ListMessages(ctx, threadID)
	if err != nil {
		return "", "", err
	}
	if len(history) > chatHistoryWindow {
		history = history[len(history)-chatHistoryWindow:]
	}

	reply := cannedReply(content)
	if s.provider != nil {
		// NUVORA Plus gate (000066): the AI assistant has a per-user daily
		// allowance. Plus accounts get a much higher allowance; free accounts
		// that exhaust their quota get a premium nudge instead of an answer.
		if s.plus != nil {
			allowance := s.plus.AIAllowance(ctx, userID)
			if !s.plus.CanUseFeature(ctx, userID, plus.FeatureAIAssistant, allowance) {
				reply = premiumAINudge()
				_, _ = s.append(ctx, threadID, chat.RoleAssistant, reply)
				return reply, thread.Status, nil
			}
		}
		grounding := ""
		if s.contextFor != nil {
			grounding, _ = s.contextFor(ctx) // grounding is best-effort
		}
		// Redact PII before it leaves the platform.
		clean := make([]chat.Message, len(history))
		for i, m := range history {
			clean[i] = m
			if m.Role == chat.RoleUser {
				clean[i].Content = redactPII(m.Content)
			}
		}
		if ai, err := s.provider.Reply(ctx, clean, grounding); err == nil && strings.TrimSpace(ai) != "" {
			reply = strings.TrimSpace(ai)
			if s.plus != nil {
				_, _ = s.plus.RecordUsage(ctx, userID, plus.FeatureAIAssistant)
			}
		}
	}

	replyMsg, err := s.append(ctx, threadID, chat.RoleAssistant, reply)
	if err != nil {
		return "", "", err
	}

	// Escalate immediately when the user explicitly asks for a human.
	if escalateRe.MatchString(content) {
		_ = s.EscalateToHuman(ctx, userID, threadID, content)
		thread.Status = chat.ThreadEscalated
	}
	return replyMsg.Content, thread.Status, nil
}

// EscalateToHuman — marks the thread ESCALATED and opens a support ticket
// carrying the transcript for the human team.
func (s *ChatService) EscalateToHuman(ctx context.Context, userID, threadID uuid.UUID, note string) error {
	thread, err := s.threadFor(ctx, userID, threadID)
	if err != nil {
		return err
	}
	if err := s.threads.SetStatus(ctx, threadID, chat.ThreadEscalated); err != nil {
		return err
	}
	msgs, _ := s.threads.ListMessages(ctx, threadID)
	transcript := make([]string, 0, len(msgs))
	for _, m := range msgs {
		transcript = append(transcript, string(m.Role)+": "+m.Content)
	}
	body := "Escalated from chat thread " + threadID.String() + ".\n"
	if strings.TrimSpace(note) != "" {
		body += "User note: " + strings.TrimSpace(note) + "\n"
	}
	body += "Transcript:\n" + strings.Join(transcript, "\n")

	email := ""
	if u, err := s.users.FindByID(ctx, userID); err == nil {
		email = u.Email
	}
	if s.notifier != nil && WhatsAppAdminNumber() != "" {
		noteText := strings.TrimSpace(note)
		if noteText == "" {
			noteText = "(no note)"
		}
		adminBody := "From: " + email + "\nThread: " + thread.Title + "\nUser note: " + noteText
		go func(subject, adminBody string) {
			nctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			if err := s.notifier.NotifyAdmin(nctx, "NUVORA chat escalated", adminBody); err != nil {
				slog.Error("whatsapp escalation notify failed", "thread", thread.ID, "error", err)
			}
		}("Chat escalated: "+thread.Title, adminBody)
	}
	if s.support != nil {
		_, err = s.support.OpenTicket(ctx, &userID, email, "Chat escalated: "+thread.Title, body)
		return err
	}
	return nil
}

// AdminListThreads — agent inbox: every thread, newest first.
func (s *ChatService) AdminListThreads(ctx context.Context) ([]chat.Thread, error) {
	list, err := s.threads.ListAllThreads(ctx)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []chat.Thread{}
	}
	return list, nil
}

// AdminListMessages — any thread's transcript for the agent inbox.
func (s *ChatService) AdminListMessages(ctx context.Context, threadID uuid.UUID) ([]chat.Message, error) {
	list, err := s.threads.ListMessages(ctx, threadID)
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []chat.Message{}
	}
	return list, nil
}

// AgentReply — a human agent answers on the thread (kept ESCALATED while
// the conversation is active).
func (s *ChatService) AgentReply(ctx context.Context, threadID uuid.UUID, content string) (*chat.Message, error) {
	if _, err := s.threads.GetThread(ctx, threadID); err != nil {
		return nil, err
	}
	content = strings.TrimSpace(content)
	if content == "" {
		return nil, fmt.Errorf("%w: reply is required", domain.ErrInvalidInput)
	}
	msg, err := s.append(ctx, threadID, chat.RoleAgent, content)
	if err != nil {
		return nil, err
	}
	// Notify the user's devices that a human replied (best-effort).
	if s.pusher != nil {
		if thread, err := s.threads.GetThread(ctx, threadID); err == nil {
			_ = s.pusher.NotifyUser(ctx, thread.UserID,
				"NUVORA support replied 💬", content, map[string]string{"thread_id": threadID.String()})
		}
	}
	return msg, nil
}

// CloseThread — ends the conversation (agent inbox).
func (s *ChatService) CloseThread(ctx context.Context, threadID uuid.UUID) error {
	if _, err := s.threads.GetThread(ctx, threadID); err != nil {
		return err
	}
	return s.threads.SetStatus(ctx, threadID, chat.ThreadClosed)
}

// RateThread — user satisfaction for a closed/any thread (C5). 1..5.
func (s *ChatService) RateThread(ctx context.Context, userID, threadID uuid.UUID, score int, comment *string) error {
	if score < 1 || score > 5 {
		return fmt.Errorf("%w: rating must be between 1 and 5", domain.ErrInvalidInput)
	}
	if _, err := s.threadFor(ctx, userID, threadID); err != nil {
		return err
	}
	return s.threads.UpdateRating(ctx, threadID, score, comment)
}

// AdminAnalytics — chat metrics for the support dashboard (C6).
type ChatAnalytics struct {
	TotalThreads     int     `json:"total_threads"`
	OpenThreads      int     `json:"open_threads"`
	EscalatedThreads int     `json:"escalated_threads"`
	ClosedThreads    int     `json:"closed_threads"`
	TotalMessages    int     `json:"total_messages"`
	AvgRating        float64 `json:"avg_rating"`
	RatedThreads     int     `json:"rated_threads"`
	CSAT             float64 `json:"csat"`            // % of rated threads ≥ 4 stars
	CSATResponded    int     `json:"csat_responded"`  // threads that were rated
	CSATTotal        int     `json:"csat_total"`      // escalated/closed threads
	EscalationRate   float64 `json:"escalation_rate"` // escalated / total
	DeflectionRate   float64 `json:"deflection_rate"` // 1 - escalated / total
}

// TrendPoint — one day of chat activity for the trends report.
type TrendPoint struct {
	Date      string  `json:"date"` // YYYY-MM-DD (UTC)
	Threads   int     `json:"threads"`
	Escalated int     `json:"escalated"`
	Rated     int     `json:"rated"`
	AvgRating float64 `json:"avg_rating"`
	CSAT      float64 `json:"csat"` // 0..100, 0 when no ratings that day
}

// AdminTrends — per-day CSAT/volume series for the last N days (C6 extra).
func (s *ChatService) AdminTrends(ctx context.Context, days int) ([]TrendPoint, error) {
	if days <= 0 || days > 90 {
		days = 14
	}
	threads, err := s.threads.ListAllThreads(ctx)
	if err != nil {
		return nil, err
	}
	now := s.now().UTC()
	points := make([]TrendPoint, days)
	idx := map[string]int{}
	for i := 0; i < days; i++ {
		d := now.AddDate(0, 0, -(days - 1 - i))
		key := d.Format("2006-01-02")
		idx[key] = i
		points[i].Date = key
	}
	for _, t := range threads {
		created := t.CreatedAt.UTC().Format("2006-01-02")
		if i, ok := idx[created]; ok {
			points[i].Threads++
			if t.Status == chat.ThreadEscalated {
				points[i].Escalated++
			}
		}
		if t.Rating != nil {
			rated := t.UpdatedAt.UTC().Format("2006-01-02")
			if i, ok := idx[rated]; ok {
				points[i].Rated++
				points[i].AvgRating += float64(*t.Rating)
				if *t.Rating >= 4 {
					points[i].CSAT++
				}
			}
		}
	}
	for i := range points {
		if points[i].Rated > 0 {
			points[i].AvgRating = round1(points[i].AvgRating / float64(points[i].Rated))
			points[i].CSAT = round1(points[i].CSAT / float64(points[i].Rated) * 100)
		}
	}
	return points, nil
}

// CSATRow — one rated thread for the CSV export.
type CSATRow struct {
	ThreadID uuid.UUID `json:"thread_id"`
	Title    string    `json:"title"`
	Status   string    `json:"status"`
	Rating   int       `json:"rating"`
	Comment  string    `json:"comment"`
	RatedAt  string    `json:"rated_at"`
	UserID   uuid.UUID `json:"user_id"`
}

func (s *ChatService) AdminAnalytics(ctx context.Context) (ChatAnalytics, error) {
	threads, err := s.threads.ListAllThreads(ctx)
	if err != nil {
		return ChatAnalytics{}, err
	}
	a := ChatAnalytics{TotalThreads: len(threads)}
	ratingSum := 0
	for _, t := range threads {
		switch t.Status {
		case chat.ThreadEscalated:
			a.EscalatedThreads++
		case chat.ThreadClosed:
			a.ClosedThreads++
		default:
			a.OpenThreads++
		}
		if t.Rating != nil {
			a.RatedThreads++
			ratingSum += *t.Rating
		}
	}
	if a.TotalThreads > 0 {
		a.EscalationRate = float64(a.EscalatedThreads) / float64(a.TotalThreads)
		a.DeflectionRate = 1 - a.EscalationRate
	}
	if a.RatedThreads > 0 {
		a.AvgRating = float64(ratingSum) / float64(a.RatedThreads)
	}
	// CSAT: share of ≥4-star ratings among threads that were rated
	// (escalated or closed — the ones users actually experienced).
	eligible := 0
	satisfied := 0
	for _, t := range threads {
		if t.Status == chat.ThreadEscalated || t.Status == chat.ThreadClosed {
			a.CSATTotal++
			if t.Rating != nil {
				eligible++
				if *t.Rating >= 4 {
					satisfied++
				}
			}
		}
	}
	a.CSATResponded = eligible
	if eligible > 0 {
		a.CSAT = float64(satisfied) / float64(eligible) * 100
	}
	return a, nil
}

// AdminCSATRows — every rated thread (CSV export).
func (s *ChatService) AdminCSATRows(ctx context.Context) ([]CSATRow, error) {
	threads, err := s.threads.ListAllThreads(ctx)
	if err != nil {
		return nil, err
	}
	out := []CSATRow{}
	for _, t := range threads {
		if t.Rating == nil {
			continue
		}
		comment := ""
		if t.RatingComment != nil {
			comment = *t.RatingComment
		}
		out = append(out, CSATRow{
			ThreadID: t.ID, Title: t.Title, Status: string(t.Status),
			Rating: *t.Rating, Comment: comment,
			RatedAt: t.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"), UserID: t.UserID,
		})
	}
	return out, nil
}

// --- helpers ---

func (s *ChatService) threadFor(ctx context.Context, userID, threadID uuid.UUID) (*chat.Thread, error) {
	t, err := s.threads.GetThread(ctx, threadID)
	if err != nil {
		return nil, err
	}
	if t.UserID != userID {
		return nil, fmt.Errorf("%w: thread not found", domain.ErrNotFound)
	}
	return t, nil
}

func (s *ChatService) append(ctx context.Context, threadID uuid.UUID, role chat.Role, content string) (*chat.Message, error) {
	m := &chat.Message{
		ID: uuid.New(), ThreadID: threadID, Role: role,
		Content: content, CreatedAt: s.now().UTC(),
	}
	if err := s.threads.AddMessage(ctx, m); err != nil {
		return nil, err
	}
	return m, nil
}

func redactPII(s string) string {
	s = emailRe.ReplaceAllString(s, "[email]")
	s = phoneRe.ReplaceAllString(s, "[phone]")
	return s
}

// cannedReply lives in chat_kb.go — FAQ answers when Gemini is off.

// premiumAINudge — shown to free users who exhaust their daily AI-assistant
// allowance, directing them to the NUVORA Plus upgrade.
func premiumAINudge() string {
	return "You've reached your free daily AI-tutor limit. Upgrade to NUVORA Plus for a much higher AI-tutor allowance, the full practice-exam vault, verified certificates and more — visit /nuvora-plus to unlock it."
}

func round1(v float64) float64 {
	return float64(int(v*10+0.5)) / 10
}
