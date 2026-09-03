package httpapi

import (
	"encoding/json"
	"fmt"
	"html"
	"net/http"

	"ykay-virtual/pkg"
)

// GoogleMobileURL — GET /auth/google/url?mobile=1
// Returns the consent URL whose redirect_uri points at the API's own
// callback-mobile route (derived from the request host), so the mobile app's
// WebView can complete OAuth without any server-side cookie. Requires
// GOOGLE_REDIRECT_MOBILE or derives from the request when mobile=1.
func (h *AuthHandler) GoogleMobileURL(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Get("mobile") == "1" {
		h.googleAuthURLWithRedirect(w, r, mobileRedirectBase(r))
		return
	}
	h.GoogleAuthURL(w, r)
}

func (h *AuthHandler) googleAuthURLWithRedirect(w http.ResponseWriter, r *http.Request, redirectURL string) {
	if h.google == nil || !h.google.Enabled() {
		WriteAppError(w, pkg.Conflict("google auth is not configured"))
		return
	}
	u, state, err := h.google.BuildAuthURLFor(r.Context(), redirectURL)
	if err != nil {
		WriteAppError(w, err)
		return
	}
	pkg.WriteSuccess(w, http.StatusOK, map[string]any{"url": u, "state": state}, nil)
}

// mobileRedirectBase — the API's own origin (scheme + host), used as the
// Google redirect_uri prefix for the mobile flow. Behind Render/proxies the
// host is the public API host; scheme honours X-Forwarded-Proto.
func mobileRedirectBase(r *http.Request) string {
	scheme := "http"
	if proto := r.Header.Get("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	} else if r.TLS != nil {
		scheme = "https"
	}
	return fmt.Sprintf("%s://%s/api/v1/auth/google/callback-mobile", scheme, r.Host)
}

// GoogleMobileCallback — GET /auth/google/callback-mobile?code=&state=
// Browser-facing endpoint for the mobile flow. Exchanges the code and renders
// a tiny branded page that posts the session token into the app's WebView via
// window.ReactNativeWebView.postMessage, with a visible copy-token fallback.
func (h *AuthHandler) GoogleMobileCallback(w http.ResponseWriter, r *http.Request) {
	if h.google == nil || !h.google.Enabled() {
		WriteAppError(w, pkg.Conflict("google auth is not configured"))
		return
	}
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if code == "" || state == "" {
		WriteAppError(w, pkg.BadRequest("missing code or state", nil))
		return
	}
	ip := clientIP(r)
	token, user, _, err := h.google.ExchangeCodeWithRedirect(r.Context(), code, state, mobileRedirectBase(r), ip, r.UserAgent())
	if err != nil {
		WriteAppError(w, err)
		return
	}
	_ = user
	payload, _ := json.Marshal(map[string]any{
		"type":  "ykv_google_auth",
		"token": token,
	})
	page := `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>YK-Virtual sign-in</title><style>
body{font-family:system-ui,sans-serif;background:#013920;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:16px;box-sizing:border-box}
.card{max-width:420px;width:100%;background:#0A4D32;border-radius:16px;padding:28px;text-align:center}
h1{font-size:20px;margin:0 0 8px;color:#70F250}.p{font-size:14px;color:#dfe8e2;line-height:1.5;margin:0 0 16px}
code{display:block;background:#013920;border:1px solid #1a5b3f;border-radius:10px;padding:12px;word-break:break-all;font-size:12px;color:#DFFFF2;text-align:left}
</style></head><body><div class="card"><h1>Sign-in successful</h1>
<p class="p">You're signed in to YK-Virtual. Return to the app — it will continue automatically.</p>
<code>%s</code></div>
<script>window.ReactNativeWebView && window.ReactNativeWebView.postMessage(%s);</script>
</body></html>`
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, page, html.EscapeString(token), string(payload))
}
