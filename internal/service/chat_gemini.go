package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"ykay-virtual/internal/domain/chat"
)

// GeminiProvider — Google Gemini (generativelanguage.googleapis.com) via
// REST. No SDK dependency: a single generateContent call per message with a
// system prompt + grounding context + conversation history.
//
// Safety notes:
//   - PII is redacted by ChatService before it reaches this provider.
//   - The system prompt constrains the bot to NUVORA topics and instructs it
//     to defer to a human for payments/refunds/account actions.
//   - Generation is capped (temperature 0.4, maxOutputTokens 500).

const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent"

type GeminiProvider struct {
	apiKey string
	model  string
	client *http.Client
}

func NewGeminiProvider(apiKey, model string) *GeminiProvider {
	if model == "" {
		model = "gemini-2.0-flash"
	}
	return &GeminiProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (g *GeminiProvider) Reply(ctx context.Context, history []chat.Message, grounding string) (string, error) {
	if g.apiKey == "" {
		return "", fmt.Errorf("gemini: no API key configured")
	}

	system := "You are Nuvora, the friendly AI assistant for NUVORA, a Nigerian/British " +
		"curriculum learning platform (tutors, programmes, cohorts, exam prep). " +
		"Be warm, concise and accurate. Answer ONLY from the provided context; if the " +
		"answer is not in the context, say you'll check with the team. Never invent " +
		"prices, dates or availability. For payments, refunds or account changes, " +
		"politely say a human agent will help and suggest asking for a human."
	if strings.TrimSpace(grounding) != "" {
		system += "\n\nLIVE PLATFORM CONTEXT (use this, it is always current):\n" + grounding
	}

	contents := make([]map[string]any, 0, len(history))
	for _, m := range history {
		role := "user"
		if m.Role == chat.RoleAssistant {
			role = "model"
		}
		contents = append(contents, map[string]any{
			"role":  role,
			"parts": []map[string]any{{"text": m.Content}},
		})
	}

	body := map[string]any{
		"systemInstruction": map[string]any{"parts": []map[string]any{{"text": system}}},
		"contents":          contents,
		"generationConfig": map[string]any{
			"temperature":     0.4,
			"maxOutputTokens": 500,
		},
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf(geminiEndpoint, g.model)+"?key="+g.apiKey, bytes.NewReader(raw))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("gemini: status %d: %s", resp.StatusCode, truncate(string(respBody), 300))
	}

	var out struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(respBody, &out); err != nil {
		return "", err
	}
	if len(out.Candidates) == 0 || len(out.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini: empty response")
	}
	return strings.TrimSpace(out.Candidates[0].Content.Parts[0].Text), nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

var _ ChatProvider = (*GeminiProvider)(nil)
