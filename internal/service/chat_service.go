package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"ykay-virtual/internal/domain"
	"ykay-virtual/internal/domain/chat"
	"ykay-virtual/internal/domain/identity"

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

// WithProvider wires the AI provider (nil-safe: unconfigured → canned reply).
func (s *ChatService) WithProvider(p ChatProvider) *ChatService {
	s.provider = p
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
	return s.append(ctx, threadID, chat.RoleAgent, content)
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
	EscalationRate   float64 `json:"escalation_rate"` // escalated / total
	DeflectionRate   float64 `json:"deflection_rate"` // 1 - escalated / total
}

func (s *ChatService) AdminAnalytics(ctx context.Context) (ChatAnalytics, error) {
	threads, err := s.threads.ListAllThreads(ctx)
	if err != nil {
		return ChatAnalytics{}, err
	}
	a := ChatAnalytics{TotalThreads: len(threads)}
	ratingSum := 0
	for _, t := range threads {
		msgs, _ := s.threads.ListMessages(ctx, t.ID)
		a.TotalMessages += len(msgs)
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
	return a, nil
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

// cannedReply — graceful degradation when no AI provider is configured.
func cannedReply(userText string) string {
	switch {
	case escalateRe.MatchString(userText):
		return "I've flagged this for our team — a human agent will follow up on this conversation shortly."
	default:
		return "Thanks for your message! I'm currently in offline training mode, but your message has been saved and our support team will get back to you shortly."
	}
}
