package httpapi

import (
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"testing"
)

// TestOpenAPIContract — G6.1: every route registered in router.go must be
// documented in api/openapi.yaml, and every documented path must be routed.
// Drift in either direction fails CI. Infra endpoints (health/metrics/
// objects/root 404) are an explicit allowlist.
func TestOpenAPIContract(t *testing.T) {
	_, thisFile, _, _ := runtime.Caller(0)
	pkgDir := filepath.Dir(thisFile)

	routerSrc, err := os.ReadFile(filepath.Join(pkgDir, "router.go"))
	if err != nil {
		t.Fatalf("read router.go: %v", err)
	}
	openapiSrc, err := os.ReadFile(filepath.Join(pkgDir, "..", "..", "..", "api", "openapi.yaml"))
	if err != nil {
		t.Fatalf("read openapi.yaml: %v", err)
	}

	// --- Extract routes from router.go source -----------------------------
	// Registrations look like:  mux.HandleFunc("POST "+v1+"/auth/register", …)
	// or bare catch-alls:       mux.HandleFunc("/api/v1/", …)
	routeRE := regexp.MustCompile(`mux\.Handle(?:Func)?\(([^,]+),`)
	litRE := regexp.MustCompile(`"([^"]*)"`)

	routed := map[string]bool{}
	for _, m := range routeRE.FindAllStringSubmatch(string(routerSrc), -1) {
		var sb strings.Builder
		for _, l := range litRE.FindAllStringSubmatch(m[1], -1) {
			sb.WriteString(l[1]) // "GET " + "/auth/register" → "GET /auth/register"
		}
		joined := sb.String()
		if joined == "" {
			continue
		}
		method, path := "", joined
		if i := strings.IndexByte(joined, ' '); i > 0 {
			method, path = joined[:i], joined[i+1:]
		}
		if method != "" && !strings.HasPrefix(path, "/") {
			path = "/" + path
		}
		if !strings.HasPrefix(path, "/api") && !strings.HasPrefix(path, "/health") &&
			path != "/metrics" && !strings.HasPrefix(path, "/objects") {
			path = "/api/v1" + path
		}
		if isInfraRoute(path) {
			continue // health/metrics/objects/root 404 are not API contract
		}
		routed[normalizePath(path)] = true
	}
	if len(routed) == 0 {
		t.Fatal("no routes extracted from router.go — parser broken?")
	}

	// --- Extract paths from openapi.yaml ----------------------------------
	openapiPathRE := regexp.MustCompile(`(?m)^  (/[^:\s]+):\s*$`)
	documented := map[string]bool{}
	for _, m := range openapiPathRE.FindAllStringSubmatch(string(openapiSrc), -1) {
		documented[normalizePath(m[1])] = true
	}
	if len(documented) == 0 {
		t.Fatal("no paths extracted from openapi.yaml — parser broken?")
	}

	// --- Compare -----------------------------------------------------------
	var unrouted []string
	for p := range routed {
		if documented[p] {
			continue
		}
		unrouted = append(unrouted, p)
	}
	sort.Strings(unrouted)

	var undocumented []string
	for p := range documented {
		if routed[p] || isInfraRoute(p) || p == "/admin/vetting/profiles/{param}/{param}" {
			// infra endpoints are documented but not contract-routed; the
			// generic vetting action path documents concrete {action} routes
			continue
		}
		undocumented = append(undocumented, p)
	}
	sort.Strings(undocumented)

	if len(unrouted) > 0 {
		t.Errorf("routes in router.go MISSING from api/openapi.yaml:\n  %s",
			strings.Join(unrouted, "\n  "))
	}
	if len(undocumented) > 0 {
		t.Errorf("paths in api/openapi.yaml NOT registered in router.go (drift):\n  %s",
			strings.Join(undocumented, "\n  "))
	}
	if len(unrouted)+len(undocumented) == 0 {
		t.Logf("contract OK: %d routed paths, %d documented paths", len(routed), len(documented))
	}
}

// normalizePath reduces parameter syntax variance so router patterns and
// openapi paths compare directly: {lessonId} and {key...} both become
// {param}, and the optional /api/v1 prefix is stripped (the spec's legacy
// entries are server-relative; generated ones are absolute).
func normalizePath(p string) string {
	re := regexp.MustCompile(`\{[^}]+\}`)
	p = re.ReplaceAllString(p, "{param}")
	return strings.TrimPrefix(p, "/api/v1")
}

// isInfraRoute — non-API endpoints (probes, metrics, object serving, 404s).
func isInfraRoute(p string) bool {
	switch normalizePath(p) {
	case "/", "/health", "/health/live", "/health/ready", "/metrics",
		"/objects/{bucket}/{param}":
		return true
	}
	return false
}
