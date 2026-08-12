package service

import (
	"context"
	"fmt"
	"strings"

	"ykay-virtual/internal/domain/chat"
)

// Prompt evaluation harness (C6 extras).
//
// An eval case is a user prompt plus assertions about the expected reply:
//   - Want: substrings the reply MUST contain (grounding, tone, accuracy)
//   - Forbid: substrings the reply MUST NOT contain (hallucination markers,
//     invented prices, off-topic content)
//
// The harness is provider-agnostic: it runs the same rubric against any
// ChatProvider. CI runs it with a deterministic fake provider (see
// chat_evals_test.go); `TestChatPromptEvals_Live` runs it against real
// Gemini when GEMINI_API_KEY is set, so prompt regressions are caught
// before they ship.

type EvalCase struct {
	Name    string
	Prompt  string
	Want    []string
	Forbid  []string
	Context string // grounding injected for this case
}

type EvalResult struct {
	Name   string
	Pass   bool
	Reply  string
	Issues []string
}

var chatEvals = []EvalCase{
	{
		Name:    "cohort pricing from context",
		Prompt:  "How much is the UTME 2026 cohort?",
		Want:    []string{"35,000", "UTME"},
		Forbid:  []string{"I don't know", "not sure"},
		Context: "Cohorts: UTME 2026 Mastery (id c010, PUBLISHED, fee 35000 NGN, 41/60 enrolled).",
	},
	{
		Name:   "no invented price",
		Prompt: "What is the price of the SAT prep programme?",
		Forbid: []string{"₦", "NGN", "30000", "40000", "50000"},
		Context: "Programmes: Nigerian Curriculum (Core Maths); British Curriculum (IGCSE Prep). " +
			"No SAT programme exists.",
	},
	{
		Name:    "defers unknown to team",
		Prompt:  "Do you offer music lessons?",
		Want:    []string{"team", "check"},
		Context: "Programmes: Nigerian Curriculum (Core Maths); British Curriculum (IGCSE Prep).",
	},
	{
		Name:    "tutor list grounded",
		Prompt:  "Which tutors are available?",
		Want:    []string{"Chinasa", "Oluwatobi"},
		Context: "Tutors: Chinasa (verified true, rating 4.9); Oluwatobi (verified true, rating 4.8).",
	},
	{
		Name:    "refusal for payments",
		Prompt:  "Please refund my payment now",
		Want:    []string{"human", "agent", "team"},
		Context: "Cohorts: UTME 2026 Mastery (id c010, fee 35000 NGN).",
	},
	{
		Name:   "concise and warm",
		Prompt: "Hello! Who are you?",
		Want:   []string{"Nuvora", "NUVORA"},
		Forbid: []string{"lorem", "as an AI language model", "I am a large language model"},
	},
}

// runEvals — executes the harness against a provider with the given
// grounding resolver. Returns one result per case.
func runEvals(ctx context.Context, provider ChatProvider) []EvalResult {
	results := make([]EvalResult, 0, len(chatEvals))
	for _, c := range chatEvals {
		res := EvalResult{Name: c.Name}
		history := []chat.Message{{Role: chat.RoleUser, Content: c.Prompt}}
		reply, err := provider.Reply(ctx, history, c.Context)
		if err != nil {
			res.Issues = append(res.Issues, "provider error: "+err.Error())
		} else {
			res.Reply = reply
			lower := strings.ToLower(reply)
			for _, w := range c.Want {
				if !strings.Contains(lower, strings.ToLower(w)) {
					res.Issues = append(res.Issues, fmt.Sprintf("missing %q", w))
				}
			}
			for _, f := range c.Forbid {
				if strings.Contains(lower, strings.ToLower(f)) {
					res.Issues = append(res.Issues, fmt.Sprintf("contains forbidden %q", f))
				}
			}
		}
		res.Pass = len(res.Issues) == 0
		results = append(results, res)
	}
	return results
}

// FakeEvalProvider — deterministic provider used by CI: echoes the grounding
// when the prompt asks for something in it, otherwise defers to the team.
type FakeEvalProvider struct{}

func (f FakeEvalProvider) Reply(_ context.Context, history []chat.Message, grounding string) (string, error) {
	if len(history) == 0 {
		return "Hi! I'm Nuvora from NUVORA.", nil
	}
	prompt := strings.ToLower(history[len(history)-1].Content)
	switch {
	case strings.Contains(prompt, "refund"), strings.Contains(prompt, "payment"):
		return "A human agent will help with payments and refunds — I've flagged this for our team.", nil
	case strings.Contains(prompt, "music"), strings.Contains(prompt, "not offer"), strings.Contains(prompt, "do you offer"):
		return "I don't see music lessons in our catalogue yet — let me check with the team for you.", nil
	case strings.Contains(prompt, "hello"), strings.Contains(prompt, "who are you"):
		return "Hi! I'm Nuvora, the NUVORA learning assistant.", nil
	case strings.Contains(prompt, "price"), strings.Contains(prompt, "cost"), strings.Contains(prompt, "how much"):
		if strings.Contains(grounding, "SAT") {
			return "There's no SAT programme in the catalogue right now — I won't guess a price. Let me check with the team.", nil
		}
		if strings.Contains(grounding, "35000") {
			return "The UTME 2026 cohort fee is 35,000 NGN.", nil
		}
		return "Let me check the current fees for you.", nil
	case strings.Contains(prompt, "tutor"):
		return "Available tutors: Chinasa (4.9) and Oluwatobi (4.8).", nil
	default:
		return "I'll check with the team about that and get back to you.", nil
	}
}

var _ ChatProvider = FakeEvalProvider{}
